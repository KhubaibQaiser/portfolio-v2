import {
  CreateTableCommand,
  DescribeTableCommand,
  type DynamoDBClient,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { buildCreateTableInput } from "./table";

/**
 * Creates the single table if it does not already exist. Intended for local
 * development and tests against DynamoDB Local; production tables are managed
 * by the CDK infrastructure stack.
 */
export async function ensureTable(
  client: DynamoDBClient,
  tableName: string,
): Promise<void> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      await client.send(new CreateTableCommand(buildCreateTableInput(tableName)));
      return;
    }
    throw error;
  }
}
