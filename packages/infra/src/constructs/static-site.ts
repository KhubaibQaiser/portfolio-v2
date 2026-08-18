import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";

export type StaticSiteDomain = {
  domainNames: string[];
  certificate: acm.ICertificate;
};

export type StaticSiteProps = {
  /** Absolute path to the pre-built static site directory (contains index.html). */
  assetDir: string;
  /** Optional custom domain + cert (cert must be in us-east-1 for CloudFront). */
  domain?: StaticSiteDomain;
  /** When true, every response includes `X-Robots-Tag: noindex, nofollow`. */
  noindex?: boolean;
};

/**
 * Hosts a pre-built static site on a private S3 bucket exposed only through
 * CloudFront (Origin Access Control) — never a public bucket. Suitable for
 * fully static artifacts like a Storybook build.
 *
 * The bucket is disposable (rebuilt and re-uploaded on every deploy), so
 * DESTROY + auto-delete is safe. Each deploy uploads the assets, prunes removed
 * files, and invalidates the distribution.
 */
export class StaticSite extends Construct {
  readonly distribution: cloudfront.Distribution;
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, "Bucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

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

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        responseHeadersPolicy: noindexHeaders,
      },
      // OAC returns 403 for missing keys; serve the app entry so deep links work.
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html" },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html" },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      domainNames: props.domain?.domainNames,
      certificate: props.domain?.certificate,
    });

    new s3deploy.BucketDeployment(this, "Deployment", {
      sources: [s3deploy.Source.asset(props.assetDir)],
      destinationBucket: this.bucket,
      prune: true,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });

    new cdk.CfnOutput(this, "SiteUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
    });
  }
}
