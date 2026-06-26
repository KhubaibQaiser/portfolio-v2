import {
  CreateTableCommand,
  DescribeTableCommand,
  type DynamoDBClient,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { buildCreateTableInputs, buildTableNames, type TableNames } from "./tables";

/**
 * Creates any missing tables. Intended for local development and tests against
 * DynamoDB Local; production tables are managed by the CDK infrastructure stack
 * (which must keep the schema in `tables.ts` in sync). Idempotent: existing
 * tables are left untouched.
 */
export async function ensureTables(
  client: DynamoDBClient,
  names: TableNames = buildTableNames(),
): Promise<void> {
  for (const input of buildCreateTableInputs(names)) {
    try {
      await client.send(new DescribeTableCommand({ TableName: input.TableName }));
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        await client.send(new CreateTableCommand(input));
        continue;
      }
      throw error;
    }
  }
}
