import { createClient } from "@/lib/supabase/server";
import { getResume } from "@portfolio/shared/supabase/queries";
import { ResumeForm } from "./resume-form";

export default async function ResumeEditPage() {
  const client = await createClient();
  const resume = await getResume(client).catch(() => null);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Resume</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Professional summary, education, certifications, and which sections appear on the PDF /
        resume page.
      </p>
      <ResumeForm initialData={resume} />
    </>
  );
}
