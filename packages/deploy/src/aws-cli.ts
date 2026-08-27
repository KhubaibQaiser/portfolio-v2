import { execFileSync } from "node:child_process";

/** Read a String parameter from SSM via the AWS CLI (caller must have credentials). */
export function getSsmParameter(name: string, region?: string): string {
  const args = [
    "ssm",
    "get-parameter",
    "--name",
    name,
    "--query",
    "Parameter.Value",
    "--output",
    "text",
  ];
  if (region) {
    args.push("--region", region);
  }

  try {
    const value = execFileSync("aws", args, { encoding: "utf8" }).trim();
    if (!value) {
      throw new Error(`SSM parameter ${name} returned an empty value`);
    }
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to read SSM parameter ${name}. Ensure AWS credentials are configured and the Data stack has been deployed.\n${message}`,
    );
  }
}

/** CloudFormation stack output whose key contains `match`. */
export function getStackOutput(
  stackName: string,
  match: string,
  region?: string,
): string {
  const args = [
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    stackName,
    "--query",
    `Stacks[0].Outputs[?contains(OutputKey, \`${match}\`)].OutputValue | [0]`,
    "--output",
    "text",
  ];
  if (region) {
    args.push("--region", region);
  }

  try {
    const value = execFileSync("aws", args, { encoding: "utf8" }).trim();
    if (!value || value === "None") {
      throw new Error(`No output matching "${match}" on stack ${stackName}`);
    }
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read CloudFormation output from ${stackName}: ${message}`);
  }
}

/** Raw string value of a Secrets Manager secret (caller must have credentials). */
export function getSecretString(secretId: string, region?: string): string {
  const args = [
    "secretsmanager",
    "get-secret-value",
    "--secret-id",
    secretId,
    "--query",
    "SecretString",
    "--output",
    "text",
  ];
  if (region) {
    args.push("--region", region);
  }

  try {
    const value = execFileSync("aws", args, { encoding: "utf8" }).trim();
    if (!value) {
      throw new Error(`Secret ${secretId} returned an empty value`);
    }
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to read secret ${secretId}. Ensure AWS credentials are configured and the stack has been deployed.\n${message}`,
    );
  }
}

/** Parsed JSON value of a Secrets Manager secret (caller must have credentials). */
export function getSecretJson<T = Record<string, string>>(
  secretId: string,
  region?: string,
): T {
  const value = getSecretString(secretId, region);
  return JSON.parse(value) as T;
}

/** First object key under `prefix` in the bucket, or undefined when empty. */
export function listFirstS3Key(
  bucket: string,
  prefix: string,
  region?: string,
): string | undefined {
  const args = ["s3", "ls", `s3://${bucket}/${prefix}`, "--recursive"];
  if (region) {
    args.push("--region", region);
  }

  const output = execFileSync("aws", args, { encoding: "utf8" }).trim();
  if (!output) {
    return undefined;
  }

  const line = output.split("\n")[0]?.trim();
  if (!line) {
    return undefined;
  }

  // `aws s3 ls` lines: "2024-01-01 12:00:00     1234 media/foo.jpg"
  const key = line.split(/\s+/).slice(3).join(" ");
  return key || undefined;
}
