import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { createAwsSiteCachePurger } from "./aws-site-cache-purger";

type ListPage = {
  Contents: Array<{ Key: string }>;
  IsTruncated: boolean;
  NextContinuationToken?: string;
};

function makePurger(pages: ListPage[], deleteResponse: object = {}) {
  const calls: string[] = [];
  const s3Send = vi.fn(async (command: unknown) => {
    if (command instanceof ListObjectsV2Command) {
      calls.push("list");
      return pages.shift() ?? { Contents: [], IsTruncated: false };
    }
    if (command instanceof DeleteObjectsCommand) {
      calls.push("delete");
      return deleteResponse;
    }
    throw new Error("unexpected S3 command");
  });
  const cfSend = vi.fn(async (_command: unknown) => {
    calls.push("invalidate");
    return { Invalidation: { Id: "INV1" } };
  });
  const purger = createAwsSiteCachePurger({
    s3: { send: s3Send } as unknown as S3Client,
    cloudfront: { send: cfSend } as unknown as CloudFrontClient,
    bucket: "site-bucket",
    cachePrefix: "_cache",
    distributionId: "DIST1",
  });
  return { purger, s3Send, cfSend, calls };
}

describe("createAwsSiteCachePurger", () => {
  it("deletes every page of the cache prefix, then invalidates /*", async () => {
    const { purger, s3Send, cfSend, calls } = makePurger([
      {
        Contents: [{ Key: "_cache/b1/index.cache" }],
        IsTruncated: true,
        NextContinuationToken: "t",
      },
      { Contents: [{ Key: "_cache/__fetch/b1/abc" }], IsTruncated: false },
    ]);

    const result = await purger.purgeAll();

    expect(result).toEqual({ deletedObjects: 2, invalidationId: "INV1" });
    expect(calls).toEqual(["list", "delete", "list", "delete", "invalidate"]);

    const firstList = s3Send.mock.calls[0]?.[0];
    if (!(firstList instanceof ListObjectsV2Command)) throw new Error("expected list");
    expect(firstList.input).toMatchObject({ Bucket: "site-bucket", Prefix: "_cache/" });

    const invalidation = cfSend.mock.calls[0]?.[0];
    if (!(invalidation instanceof CreateInvalidationCommand))
      throw new Error("expected invalidation");
    expect(invalidation.input.DistributionId).toBe("DIST1");
    expect(invalidation.input.InvalidationBatch?.Paths).toEqual({
      Quantity: 1,
      Items: ["/*"],
    });
  });

  it("still invalidates the CDN when the cache prefix is empty", async () => {
    const { purger, calls } = makePurger([{ Contents: [], IsTruncated: false }]);
    await expect(purger.purgeAll()).resolves.toEqual({
      deletedObjects: 0,
      invalidationId: "INV1",
    });
    expect(calls).toEqual(["list", "invalidate"]);
  });

  it("fails before invalidating when S3 reports delete errors", async () => {
    const { purger, cfSend } = makePurger(
      [{ Contents: [{ Key: "_cache/b1/index.cache" }], IsTruncated: false }],
      { Errors: [{ Code: "AccessDenied" }] },
    );
    await expect(purger.purgeAll()).rejects.toThrow(/AccessDenied/);
    expect(cfSend).not.toHaveBeenCalled();
  });
});
