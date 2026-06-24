import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { createS3MediaStore } from "./s3-media-store";

function makeStore(send = vi.fn(async (_command: unknown) => ({}))) {
  const client = { send } as unknown as S3Client;
  const store = createS3MediaStore({
    client,
    bucket: "media-bucket",
    publicBaseUrl: "https://cdn.example.com/",
  });
  return { store, send };
}

describe("createS3MediaStore", () => {
  it("reports itself as configured", () => {
    expect(makeStore().store.isConfigured()).toBe(true);
  });

  it("sanitizes filenames and builds prefixed keys", () => {
    const { store } = makeStore();
    expect(store.safeObjectFilename("a/b/My Photo!.png")).toBe("My_Photo_.png");
    const key = store.buildObjectKey("../weird name.png");
    expect(key).toMatch(/^media\/[0-9a-f-]{36}-weird_name\.png$/);
  });

  it("validates image MIME types", () => {
    const { store } = makeStore();
    expect(store.isAllowedImageMime("image/png")).toBe(true);
    expect(store.isAllowedImageMime("application/pdf")).toBe(false);
  });

  it("builds public URLs without double slashes and reverses them", () => {
    const { store } = makeStore();
    const url = store.buildPublicObjectUrl("media/abc-x.png");
    expect(url).toBe("https://cdn.example.com/media/abc-x.png");
    expect(store.publicUrlToObjectKey(url)).toBe("media/abc-x.png");
    expect(store.publicUrlToObjectKey("https://other.com/media/x.png")).toBeNull();
  });

  it("decodes encoded object keys from public URLs", () => {
    const { store } = makeStore();
    const url = "https://cdn.example.com/media/a%20b.png";
    expect(store.publicUrlToObjectKey(url)).toBe("media/a b.png");
  });

  it("uploads bytes with the right bucket/key/content-type", async () => {
    const { store, send } = makeStore();
    await store.uploadObject(new Uint8Array([1, 2, 3]), "media/x.png", "image/png");
    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls.at(0)?.[0];
    if (!(command instanceof PutObjectCommand))
      throw new Error("expected PutObjectCommand");
    expect(command.input).toMatchObject({
      Bucket: "media-bucket",
      Key: "media/x.png",
      ContentType: "image/png",
    });
  });

  it("deletes objects by key", async () => {
    const { store, send } = makeStore();
    await store.deleteObject("media/x.png");
    const command = send.mock.calls.at(0)?.[0];
    if (!(command instanceof DeleteObjectCommand))
      throw new Error("expected DeleteObjectCommand");
    expect(command.input).toMatchObject({ Bucket: "media-bucket", Key: "media/x.png" });
  });

  it("creates a presigned PUT URL containing the key and signature", async () => {
    const client = new S3Client({
      region: "us-east-1",
      credentials: { accessKeyId: "AKIA", secretAccessKey: "secret" },
    });
    const store = createS3MediaStore({
      client,
      bucket: "media-bucket",
      publicBaseUrl: "https://cdn.example.com",
    });
    const url = await store.createPresignedPutUrl("media/x.png", "image/png", 120);
    expect(url).toContain("media-bucket");
    expect(url).toContain("media/x.png");
    expect(url).toContain("X-Amz-Signature=");
    expect(url).toContain("X-Amz-Expires=120");
  });
});
