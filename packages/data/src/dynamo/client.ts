import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Builds a DynamoDB Document client. When `DYNAMODB_LOCAL_ENDPOINT` is set the
 * client targets DynamoDB Local (Docker) with dummy credentials; otherwise it
 * uses the ambient AWS credentials/region (Lambda execution role in production).
 */
export function createDynamoClient(): DynamoDBDocumentClient {
  const endpoint = process.env.DYNAMODB_LOCAL_ENDPOINT;
  const region = process.env.AWS_REGION ?? "eu-west-1";

  const base = new DynamoDBClient({
    region,
    ...(endpoint
      ? {
          endpoint,
          credentials: { accessKeyId: "local", secretAccessKey: "local" },
        }
      : {}),
  });

  return DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
}
