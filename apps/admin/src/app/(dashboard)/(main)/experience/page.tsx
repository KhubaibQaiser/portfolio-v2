import { createClient } from "@/lib/supabase/server";
import { getExperience } from "@portfolio/shared/supabase/queries";
import { ExperienceList } from "./experience-list";

export default async function ExperienceListPage() {
  const client = await createClient();
  const experience = await getExperience(client);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experience</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your work experience entries.
          </p>
        </div>
      </div>
      <ExperienceList initialData={experience} />
    </>
  );
}
