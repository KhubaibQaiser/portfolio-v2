import { createHash } from "node:crypto";

/**
 * CloudFront Lambda@Edge (origin-request): sign POST/PUT bodies for OAC.
 *
 * OAC signs origin requests to the Lambda function URL with SigV4, but for
 * requests WITH a body (POST/PUT — chat, contact) the function URL
 * requires an `x-amz-content-sha256` header holding the SHA-256 of the body.
 * CloudFront OAC does not compute it and Lambda rejects unsigned payloads, so
 * without this every POST fails at the function URL with "signature does not
 * match" before the app runs. We compute the hash here so OAC signs with the
 * correct payload hash. GET/HEAD have no body and sign fine, so they're skipped.
 *
 * See AWS: "Restrict access to an AWS Lambda function URL origin".
 *
 * @param {import("aws-lambda").CloudFrontRequestEvent} event
 * @returns {Promise<import("aws-lambda").CloudFrontRequestResult>}
 */
export const handler = async (event) => {
  const request = event.Records[0].cf.request;

  // Bodiless methods sign fine without the header; skip the work.
  if (request.method === "GET" || request.method === "HEAD") {
    return request;
  }

  const body = request.body;
  if (body && body.data) {
    // A truncated body (origin-request cap is 1 MB) would hash to a value that
    // can't match the payload, yielding a misleading 403. Fail loud with a 413
    // instead of forwarding a doomed request.
    if (body.inputTruncated) {
      return {
        status: "413",
        statusDescription: "Payload Too Large",
        headers: {
          "content-type": [{ key: "Content-Type", value: "application/json" }],
        },
        body: JSON.stringify({ error: "Request body too large." }),
      };
    }

    const buf = Buffer.from(
      body.data,
      body.encoding === "base64" ? "base64" : "utf8",
    );
    const hash = createHash("sha256").update(buf).digest("hex");
    request.headers["x-amz-content-sha256"] = [
      { key: "x-amz-content-sha256", value: hash },
    ];
  }

  return request;
};
