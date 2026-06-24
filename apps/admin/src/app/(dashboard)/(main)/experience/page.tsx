import { getContentRepository } from "@portfolio/data";
import { ExperienceList } from "./experience-list";

export default async function ExperienceListPage() {
  const experience = await getContentRepository().getExperience();

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experience</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your work experience entries.
          </p>
        </div>
      </div>
      <ExperienceList initialData={experience} />
    </>
  );
}
