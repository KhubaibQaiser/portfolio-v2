import { getContentRepository } from "@portfolio/data";
import { linkedInRecommendationsUrlFromProfile } from "@portfolio/shared/schemas";
import { RecommendationsList } from "./recommendations-list";

export default async function RecommendationsPage() {
  const repo = getContentRepository();
  const [recommendations, siteConfig] = await Promise.all([
    repo.getTestimonials().catch(() => []),
    repo.getSiteConfig().catch(() => null),
  ]);

  const linkedInProfile = siteConfig?.social_links.find(
    (link) => link.platform.toLowerCase() === "linkedin",
  )?.url;
  const defaultLinkedInUrl = linkedInRecommendationsUrlFromProfile(linkedInProfile);

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
      <RecommendationsList
        initialData={recommendations}
        defaultLinkedInUrl={defaultLinkedInUrl}
      />
    </>
  );
}
