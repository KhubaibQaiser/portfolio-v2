import { readFileSync } from "node:fs";
import path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";

const CACHE_PREFIX = "_cache";
const ASSETS_PREFIX = "_assets";

export type NextjsSiteDomain = {
  domainNames: string[];
  certificate: acm.ICertificate;
};

export type NextjsSiteProps = {
  /** Absolute path to the app's `.open-next` build output. */
  openNextDir: string;
  /** Region the site's regional resources live in (for OpenNext cache env). */
  region: string;
  /** Extra environment for the server function (app config, e.g. data layer). */
  environment?: Record<string, string>;
  /** Optional custom domain + cert (cert must be in us-east-1). */
  domain?: NextjsSiteDomain;
  /** Hook to grant the server function access to app resources (table, media). */
  grantServer?: (serverFunction: lambda.Function) => void;
};

/**
 * Deploys a Next.js app built with OpenNext onto Lambda + CloudFront, following
 * the OpenNext reference architecture:
 *  - one S3 bucket holding static assets (`_assets`) and the ISR cache (`_cache`)
 *  - a streaming server Lambda (SSR/API/ISR) behind a CloudFront origin
 *  - an image-optimization Lambda for `/_next/image`
 *  - an SQS FIFO queue + revalidation Lambda for on-demand ISR
 *  - a DynamoDB tag-cache table (PK `tag` / SK `path`, GSI `revalidate`)
 *
 * The build-id is read from the bundle and passed to the server so cache/tag
 * keys line up with what OpenNext wrote at build time.
 */
export class NextjsSite extends Construct {
  readonly distribution: cloudfront.Distribution;
  readonly serverFunction: lambda.Function;
  readonly bucket: s3.Bucket;
  /** Server function log group — exposed so the app stack can attach an
   *  error metric filter without importing across stacks. */
  readonly serverLogGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: NextjsSiteProps) {
    super(scope, id);
    const { openNextDir, region } = props;
    const buildId = readFileSync(
      path.join(openNextDir, "assets", "BUILD_ID"),
      "utf8",
    ).trim();

    const runtime = lambda.Runtime.NODEJS_22_X;
    const architecture = lambda.Architecture.ARM_64;

    // Explicit log groups with bounded retention: Lambda's default groups never
    // expire, so storage accrues forever. Two weeks is plenty for a portfolio
    // and keeps CloudWatch Logs storage near $0 (see ADR 0002).
    const logGroupFor = (fnId: string): logs.LogGroup =>
      new logs.LogGroup(this, `${fnId}Logs`, {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    this.serverLogGroup = logGroupFor("ServerFn");

    // Static assets + ISR cache live in one private bucket. Disposable: rebuilt
    // on every deploy, so DESTROY + auto-delete is safe.
    this.bucket = new s3.Bucket(this, "AssetsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Tag cache for revalidateTag/revalidatePath. Schema is dictated by the
    // OpenNext DynamoDB tag cache (mode "original").
    const tagTable = new dynamodb.Table(this, "TagCache", {
      partitionKey: { name: "tag", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "path", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    tagTable.addGlobalSecondaryIndex({
      indexName: "revalidate",
      partitionKey: { name: "path", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "revalidatedAt", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const revalidationQueue = new sqs.Queue(this, "RevalidationQueue", {
      fifo: true,
      contentBasedDeduplication: true,
    });

    this.serverFunction = new lambda.Function(this, "ServerFn", {
      runtime,
      architecture,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(openNextDir, "server-functions", "default")),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      logGroup: this.serverLogGroup,
      environment: {
        CACHE_BUCKET_NAME: this.bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: CACHE_PREFIX,
        CACHE_BUCKET_REGION: region,
        CACHE_DYNAMO_TABLE: tagTable.tableName,
        REVALIDATION_QUEUE_URL: revalidationQueue.queueUrl,
        REVALIDATION_QUEUE_REGION: region,
        OPEN_NEXT_BUILD_ID: buildId,
        ...props.environment,
      },
    });
    this.bucket.grantReadWrite(this.serverFunction);
    tagTable.grantReadWriteData(this.serverFunction);
    revalidationQueue.grantSendMessages(this.serverFunction);
    props.grantServer?.(this.serverFunction);

    const imageFunction = new lambda.Function(this, "ImageFn", {
      runtime,
      architecture,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(openNextDir, "image-optimization-function")),
      memorySize: 1536,
      timeout: cdk.Duration.seconds(30),
      logGroup: logGroupFor("ImageFn"),
      environment: {
        BUCKET_NAME: this.bucket.bucketName,
        BUCKET_KEY_PREFIX: ASSETS_PREFIX,
      },
    });
    this.bucket.grantRead(imageFunction);

    const revalidationFunction = new lambda.Function(this, "RevalidationFn", {
      runtime,
      architecture,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(openNextDir, "revalidation-function")),
      timeout: cdk.Duration.seconds(30),
      logGroup: logGroupFor("RevalidationFn"),
    });
    revalidationFunction.addEventSource(
      new SqsEventSource(revalidationQueue, { batchSize: 5 }),
    );

    // --- CloudFront ---
    const serverFnUrl = this.serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });
    const imageFnUrl = imageFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    const serverOrigin = origins.FunctionUrlOrigin.withOriginAccessControl(serverFnUrl, {
      readTimeout: cdk.Duration.seconds(60),
    });
    const imageOrigin = origins.FunctionUrlOrigin.withOriginAccessControl(imageFnUrl);
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
      originPath: `/${ASSETS_PREFIX}`,
    });

    const serverCachePolicy = new cloudfront.CachePolicy(this, "ServerCache", {
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        "accept",
        "rsc",
        "next-router-prefetch",
        "next-router-state-tree",
        "next-url",
      ),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
      defaultTtl: cdk.Duration.seconds(0),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.days(365),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    const imageCachePolicy = new cloudfront.CachePolicy(this, "ImageCache", {
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList("accept"),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      defaultTtl: cdk.Duration.days(1),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.days(365),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    const serverBehavior: cloudfront.BehaviorOptions = {
      origin: serverOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: serverCachePolicy,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    };
    const staticBehavior: cloudfront.BehaviorOptions = {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    };

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: serverBehavior,
      additionalBehaviors: {
        "_next/image*": {
          origin: imageOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: imageCachePolicy,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        "_next/data/*": serverBehavior,
        "_next/*": staticBehavior,
        BUILD_ID: staticBehavior,
        "llms.txt": staticBehavior,
        "manifest.json": staticBehavior,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      domainNames: props.domain?.domainNames,
      certificate: props.domain?.certificate,
    });

    // CloudFront (via OAC) must be allowed to invoke the function URLs. Since
    // October 2025 Lambda requires BOTH lambda:InvokeFunctionUrl AND
    // lambda:InvokeFunction (invokedViaFunctionUrl) for OAC-signed requests;
    // CDK's withOriginAccessControl only grants the former (aws-cdk#35872).
    for (const fn of [this.serverFunction, imageFunction]) {
      fn.addPermission("AllowCloudFrontInvokeUrl", {
        principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
        action: "lambda:InvokeFunctionUrl",
        sourceArn: this.distribution.distributionArn,
      });
      fn.addPermission("AllowCloudFrontInvoke", {
        principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
        action: "lambda:InvokeFunction",
        sourceArn: this.distribution.distributionArn,
        invokedViaFunctionUrl: true,
      });
    }

    // Upload assets (browser-cacheable) and the ISR cache (private) to S3.
    new s3deploy.BucketDeployment(this, "AssetsDeployment", {
      sources: [s3deploy.Source.asset(path.join(openNextDir, "assets"))],
      destinationBucket: this.bucket,
      destinationKeyPrefix: ASSETS_PREFIX,
      prune: true,
      cacheControl: [
        s3deploy.CacheControl.fromString(
          "public,max-age=0,s-maxage=31536000,must-revalidate",
        ),
      ],
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });
    new s3deploy.BucketDeployment(this, "CacheDeployment", {
      sources: [s3deploy.Source.asset(path.join(openNextDir, "cache"))],
      destinationBucket: this.bucket,
      destinationKeyPrefix: CACHE_PREFIX,
      prune: true,
      memoryLimit: 1024,
    });

    new cdk.CfnOutput(this, "SiteUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
    });
  }
}
