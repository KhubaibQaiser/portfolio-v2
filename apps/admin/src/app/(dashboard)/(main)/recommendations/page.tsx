import { getContentRepository } from "@portfolio/data";
import { RecommendationsList } from "./recommendations-list";

export default async function RecommendationsPage() {
  const recommendations = await getContentRepository()
    .getTestimonials()
    .catch(() => []);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage LinkedIn recommendations copied manually from your profile.
          </p>
        </div>
      </div>
      <RecommendationsList initialData={recommendations} />
    </>
  );
}
