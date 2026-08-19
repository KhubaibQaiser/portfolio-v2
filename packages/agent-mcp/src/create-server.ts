import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ADR_IDS, AI_CONTRACT_MODULES, readAdr, readAiContract } from "./context";

export function createServer(): McpServer {
  const server = new McpServer({ name: "portfolio-context", version: "1.0.0" });

  server.registerTool(
    "get_adr",
    {
      description:
        "Read an architecture decision record from docs/adr/. Use before changing CDK stacks or cross-stack wiring.",
      inputSchema: z.object({
        id: z.enum(ADR_IDS).describe("ADR number, e.g. 0001"),
      }),
    },
    async ({ id }) => ({
      content: [{ type: "text" as const, text: readAdr(id) }],
    }),
  );

  server.registerTool(
    "get_ai_contract",
    {
      description:
        "Read the Zod schema and shared prompt rules for a Resume AI module. Use before editing prompts, schemas, or guardrails.",
      inputSchema: z.object({
        module: z.enum(AI_CONTRACT_MODULES),
      }),
    },
    async ({ module }) => ({
      content: [{ type: "text" as const, text: readAiContract(module) }],
    }),
  );

  return server;
}
