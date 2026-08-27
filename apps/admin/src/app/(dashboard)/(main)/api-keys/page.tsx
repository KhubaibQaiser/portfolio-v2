import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";

/**
 * MCP HTTP auth is OAuth 2.1 (ADR 0006). API-key minting was retired with
 * ADR 0005. This page points operators at connect docs and Cognito clients.
 */
export default async function McpOAuthPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/login");

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">MCP OAuth</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The candidate MCP server authenticates with Cognito OAuth 2.1 (authorization
          code + PKCE for Claude/Inspector; client credentials for n8n). Hashed API keys
          are no longer used as MCP credentials.
        </p>
      </div>
      <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
        <li>
          Connect docs:{" "}
          <code className="text-foreground">docs/n8n-candidate-mcp-demo.md</code> in the
          repo (Claude Always required, n8n client_credentials, Inspector DCR).
        </li>
        <li>
          Stack outputs <code className="text-foreground">ClaudeClientId</code>,{" "}
          <code className="text-foreground">TokenEndpoint</code>, and{" "}
          <code className="text-foreground">AuthorizeEndpoint</code> on{" "}
          <code className="text-foreground">Portfolio-CandidateMcp</code>.
        </li>
        <li>
          n8n / smoke client secret: Secrets Manager{" "}
          <code className="text-foreground">
            /portfolio/candidate-mcp/n8n-workflow-client
          </code>
          .
        </li>
        <li>
          Interactive Hosted UI login needs a Cognito user in the agent pool (create once
          in the AWS console after deploy).
        </li>
      </ul>
    </div>
  );
}
