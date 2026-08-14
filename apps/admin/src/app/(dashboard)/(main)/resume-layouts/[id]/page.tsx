import { notFound } from "next/navigation";
import { getContentRepository } from "@portfolio/data";
import { LayoutForm } from "./layout-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ResumeLayoutEditPage({ params }: Props) {
  const { id } = await params;
  const layout = await getContentRepository().getResumeLayoutById(id);
  if (!layout) notFound();

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{layout.name}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Edit AI tailoring guidelines for this visual template. Public downloads use
        whichever layout is marked default.
      </p>
      <LayoutForm layout={layout} />
    </>
  );
}
