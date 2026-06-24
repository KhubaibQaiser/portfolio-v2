import { getContentRepository } from "@portfolio/data";
import { uniqueCompanyCount } from "@portfolio/shared/experience-stats";
import { AboutForm } from "./about-form";

export default async function AboutEditPage() {
  const repo = getContentRepository();
  const [about, experience] = await Promise.all([
    repo.getAbout().catch(() => null),
    repo.getExperience().catch(() => []),
  ]);
  const derivedCompaniesCount = uniqueCompanyCount(experience);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Edit About Section</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Update your bio, stats, and availability status.
      </p>
      <AboutForm initialData={about} derivedCompaniesCount={derivedCompaniesCount} />
    </>
  );
}
