import { createClient } from "@/lib/supabase/server";
import { getSkills } from "@portfolio/shared/supabase/queries";
import { SkillsEditor } from "./skills-editor";

export default async function SkillsPage() {
  const client = await createClient();
  const skills = await getSkills(client).catch(() => []);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your skill categories and proficiency levels.
        </p>
      </div>
      <SkillsEditor initialData={skills} />
    </>
  );
}
