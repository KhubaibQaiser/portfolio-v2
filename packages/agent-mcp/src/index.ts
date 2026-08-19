import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./create-server";

void serveStdio(createServer);
console.error("portfolio-context MCP server running on stdio");
