import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

/** Physical name of the single DynamoDB table backing all content. */
export function resolveTableName(): string {
  return process.env.DYNAMO_TABLE_NAME ?? "portfolio";
}

/**
 * Single-table key schema:
 *  - pk / sk        : entity partition + item key (list-by-type via pk, item by sk)
 *  - gsi1pk / gsi1sk: sparse secondary access (e.g. project lookup by slug)
 */
export function buildCreateTableInput(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" },
      { AttributeName: "sk", AttributeType: "S" },
      { AttributeName: "gsi1pk", AttributeType: "S" },
      { AttributeName: "gsi1sk", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "sk", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "gsi1",
        KeySchema: [
          { AttributeName: "gsi1pk", KeyType: "HASH" },
          { AttributeName: "gsi1sk", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  };
}
