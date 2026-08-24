import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import { wwwRedirectFunctionCode } from "../cloudfront/www-redirect";

const CACHE_PREFIX = "_cache";
const ASSETS_PREFIX = "_assets";

const lambdaDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../lambda");

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
  /**
   * When set, a viewer-request CloudFront Function 301s `www.{host}` to
   * `https://{host}` (path + query preserved). Use the apex hostname only.
   */
  canonicalApexHost?: string;
  /** When true, every response includes `X-Robots-Tag: noindex, nofollow`. */
  noindex?: boolean;
  /** Hook to grant the server function access to app resources (table, media). */
  grantServer?: (serverFunction: lambda.Function) => void;
};

/**
 * Deploys a Next.js app built with OpenNext onto Lambda + CloudFront:
 *  - one S3 bucket holding static assets (`_assets`) and the ISR cache (`_cache`)
 *  - a streaming server Lambda (SSR/API/ISR) behind a CloudFront origin
 *  - an image-optimization Lambda for `/_next/image`
 *
 * Asset classes (OpenNext fingerprinted-asset model):
 *  - Hashed `_assets/_next/**` — immutable, never pruned; lifecycle expires
 *    unused hashes after 30 days so stale HTML can still load old CSS/JS.
 *  - Unhashed public files under `_assets` — short browser cache; CloudFront
 *    invalidated on deploy. Both asset uploads use `prune: false` because a
 *    second deploy to the shared `_assets` prefix with `prune: true` would
 *    delete `_next/**`.
 *  - ISR seed `_cache/**` — replaced each deploy (`prune: true`).
 *
 * Server Lambda depends on hashed assets + cache seed so new HTML never
 * references CSS that is not yet on S3. Time-based ISR uses the S3
 * incremental cache and the direct queue (self HEAD on stale pages). No
 * DynamoDB tag cache, SQS, or revalidation Lambda.
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

    const logGroupFor = (fnId: string): logs.LogGroup =>
      new logs.LogGroup(this, `${fnId}Logs`, {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    this.serverLogGroup = logGroupFor("ServerFn");

    this.bucket = new s3.Bucket(this, "AssetsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          // Re-PUT on each deploy refreshes LastModified for the current
          // build; only abandoned hashes from previous builds age out.
          id: "ExpireUnusedHashedAssets",
          prefix: `${ASSETS_PREFIX}/_next/`,
          expiration: cdk.Duration.days(30),
        },
      ],
    });

    this.serverFunction = new lambda.Function(this, "ServerFn", {
      runtime,
      architecture,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(openNextDir, "server-functions", "default")),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(60),
      logGroup: this.serverLogGroup,
      environment: {
        CACHE_BUCKET_NAME: this.bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: CACHE_PREFIX,
        CACHE_BUCKET_REGION: region,
        OPEN_NEXT_BUILD_ID: buildId,
        ...props.environment,
      },
    });
    this.bucket.grantReadWrite(this.serverFunction);
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

    const signBodyFn = new cloudfront.experimental.EdgeFunction(this, "SignPostBodyFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(lambdaDir, "sign-post-body")),
    });

    const wwwRedirectFn = props.canonicalApexHost
      ? new cloudfront.Function(this, "WwwRedirectFn", {
          comment: `301 www to https://${props.canonicalApexHost}`,
          runtime: cloudfront.FunctionRuntime.JS_2_0,
          code: cloudfront.FunctionCode.fromInline(
            wwwRedirectFunctionCode(props.canonicalApexHost),
          ),
        })
      : undefined;
    const viewerRequestAssociation: cloudfront.FunctionAssociation[] | undefined =
      wwwRedirectFn
        ? [
            {
              function: wwwRedirectFn,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ]
        : undefined;

    const noindexHeaders = props.noindex
      ? new cloudfront.ResponseHeadersPolicy(this, "NoIndexHeaders", {
          comment: "Prevent search indexing of this distribution",
          customHeadersBehavior: {
            customHeaders: [
              { header: "X-Robots-Tag", value: "noindex, nofollow", override: true },
            ],
          },
        })
      : undefined;

    const serverBehavior: cloudfront.BehaviorOptions = {
      origin: serverOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: serverCachePolicy,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      functionAssociations: viewerRequestAssociation,
      responseHeadersPolicy: noindexHeaders,
      edgeLambdas: [
        {
          functionVersion: signBodyFn.currentVersion,
          eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          includeBody: true,
        },
      ],
    };
    const staticBehavior: cloudfront.BehaviorOptions = {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      functionAssociations: viewerRequestAssociation,
      responseHeadersPolicy: noindexHeaders,
    };

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      // llms.txt is server-rendered (apps/web/src/app/llms.txt/route.ts) so
      // it can reflect live CMS data — it must go through serverBehavior
      // (the distribution default), not a static S3 behavior, to reach Lambda.
      defaultBehavior: serverBehavior,
      additionalBehaviors: {
        "_next/image*": {
          origin: imageOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: imageCachePolicy,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          functionAssociations: viewerRequestAssociation,
          responseHeadersPolicy: noindexHeaders,
        },
        "_next/data/*": serverBehavior,
        "_next/*": staticBehavior,
        BUILD_ID: staticBehavior,
      },
      // Do not map errors to index.html (that is Storybook SPA only). Zero TTL
      // so a mid-deploy S3 miss is not sticky for five minutes.
      errorResponses: [
        { httpStatus: 403, ttl: cdk.Duration.seconds(0) },
        { httpStatus: 404, ttl: cdk.Duration.seconds(0) },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      domainNames: props.domain?.domainNames,
      certificate: props.domain?.certificate,
    });

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

    // Hashed CSS/JS: never prune and never invalidate — unique filenames;
    // stale HTML from a prior build must still resolve these objects.
    const hashedAssets = new s3deploy.BucketDeployment(this, "HashedAssets", {
      sources: [
        s3deploy.Source.asset(path.join(openNextDir, "assets"), {
          exclude: ["*", "!_next", "!_next/**"],
        }),
      ],
      destinationBucket: this.bucket,
      destinationKeyPrefix: ASSETS_PREFIX,
      prune: false,
      memoryLimit: 1024,
      cacheControl: [
        s3deploy.CacheControl.fromString("public,max-age=31536000,immutable"),
      ],
    });

    // Unhashed public/ files: short browser cache; invalidate CloudFront on
    // deploy. prune: false — a prune on the shared _assets prefix would delete
    // _next/** because those keys are absent from this source.
    new s3deploy.BucketDeployment(this, "PublicAssets", {
      sources: [
        s3deploy.Source.asset(path.join(openNextDir, "assets"), {
          exclude: ["_next", "_next/**"],
        }),
      ],
      destinationBucket: this.bucket,
      destinationKeyPrefix: ASSETS_PREFIX,
      prune: false,
      cacheControl: [
        s3deploy.CacheControl.fromString(
          "public,max-age=0,s-maxage=31536000,must-revalidate",
        ),
      ],
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });

    const cacheDeployment = new s3deploy.BucketDeployment(this, "CacheDeployment", {
      sources: [s3deploy.Source.asset(path.join(openNextDir, "cache"))],
      destinationBucket: this.bucket,
      destinationKeyPrefix: CACHE_PREFIX,
      prune: true,
      memoryLimit: 1024,
    });

    // New BUILD_ID HTML must not go live before hashed CSS/JS and the ISR seed
    // are on S3 (avoids new-HTML / missing-new-CSS and sticky 403s).
    this.serverFunction.node.addDependency(hashedAssets);
    this.serverFunction.node.addDependency(cacheDeployment);

    new cdk.CfnOutput(this, "SiteUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
    });
  }
}
