import { redirect } from "next/navigation";
import { getMcpApiKeyStore } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import { ApiKeysList } from "./api-keys-list";

export default async function ApiKeysPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/login");

  const keys = await getMcpApiKeyStore().listKeys().catch(() => []);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">MCP API keys</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage bearer tokens for the candidate MCP server (Claude.ai, n8n). Keys
          are hashed at rest; revoke to stop a noisy client without disabling the
          whole server.
        </p>
      </div>
      <ApiKeysList initialKeys={keys} />
    </>
  );
}
