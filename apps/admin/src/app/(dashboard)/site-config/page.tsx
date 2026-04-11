import { createClient } from "@/lib/supabase/server";
import { getSiteConfig } from "@portfolio/shared/supabase/queries";
import { SiteConfigForm } from "./site-config-form";

export default async function SiteConfigPage() {
  const client = await createClient();
  const config = await getSiteConfig(client).catch(() => null);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Site Configuration</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your personal info, social links, and SEO metadata.
      </p>
      <SiteConfigForm initialData={config} />
    </>
  );
}
