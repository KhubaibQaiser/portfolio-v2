import { getContentRepository } from "@portfolio/data";
import { ResumeForm } from "./resume-form";

export default async function ResumeEditPage() {
  const resume = await getContentRepository()
    .getResume()
    .catch(() => null);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Resume</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Professional summary, education, certifications, and which sections appear on the
        PDF / resume page.
      </p>
      <ResumeForm initialData={resume} />
    </>
  );
}
