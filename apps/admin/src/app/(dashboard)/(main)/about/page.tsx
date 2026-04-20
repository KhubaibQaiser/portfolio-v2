import { createClient } from "@/lib/supabase/server";
import { getAbout, getExperience } from "@portfolio/shared/supabase/queries";
import { uniqueCompanyCount } from "@portfolio/shared/experience-stats";
import { AboutForm } from "./about-form";

export default async function AboutEditPage() {
  const client = await createClient();
  const [about, experience] = await Promise.all([
    getAbout(client).catch(() => null),
    getExperience(client).catch(() => []),
  ]);
  const derivedCompaniesCount = uniqueCompanyCount(experience);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Edit About Section</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your bio, stats, and availability status.
      </p>
      <AboutForm initialData={about} derivedCompaniesCount={derivedCompaniesCount} />
    </>
  );
}
