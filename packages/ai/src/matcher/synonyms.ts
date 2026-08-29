/** Lowercase skill aliases used by the ingest matcher (not LLM ATS). */
export const SKILL_SYNONYMS: Readonly<Record<string, string>> = {
  "next.js": "nextjs",
  nextjs: "nextjs",
  "node.js": "nodejs",
  nodejs: "nodejs",
  "react.js": "react",
  reactjs: "react",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  postgresql: "postgres",
  postgres: "postgres",
  "amazon web services": "aws",
  aws: "aws",
  "ci/cd": "cicd",
  cicd: "cicd",
  dynamodb: "dynamodb",
  "dynamo db": "dynamodb",
};

export function canonicalSkill(name: string): string {
  const key = name.trim().toLowerCase();
  return SKILL_SYNONYMS[key] ?? key.replace(/[^a-z0-9+]+/g, "");
}
