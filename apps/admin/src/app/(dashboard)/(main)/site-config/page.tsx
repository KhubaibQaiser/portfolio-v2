import { getContentRepository } from "@portfolio/data";
import { SiteConfigForm } from "./site-config-form";

export default async function SiteConfigPage() {
  const config = await getContentRepository()
    .getSiteConfig()
    .catch(() => null);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Site Configuration</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Update your personal info, social links, and SEO metadata.
      </p>
      <SiteConfigForm initialData={config} />
    </>
  );
}
