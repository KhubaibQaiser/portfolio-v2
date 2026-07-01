import { getContentRepository } from "@portfolio/data";
import { SkillsEditor } from "./skills-editor";

export default async function SkillsPage() {
  const skills = await getContentRepository()
    .getSkills()
    .catch(() => []);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage skill categories, proficiency, and display order (drag to reorder within
          each category).
        </p>
      </div>
      <SkillsEditor initialData={skills} />
    </>
  );
}
