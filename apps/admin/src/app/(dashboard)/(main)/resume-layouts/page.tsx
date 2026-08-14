import { getContentRepository } from "@portfolio/data";
import { LayoutsList } from "./layouts-list";

export default async function ResumeLayoutsPage() {
  const layouts = await getContentRepository()
    .getResumeLayouts()
    .catch(() => []);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Resume layouts</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Visual templates and AI tailoring guidelines. The default layout is used for
        public PDF downloads.
      </p>
      <LayoutsList initialData={layouts} />
    </>
  );
}
