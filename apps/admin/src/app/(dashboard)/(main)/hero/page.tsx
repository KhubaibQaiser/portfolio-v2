import { getContentRepository } from "@portfolio/data";
import { HeroForm } from "./hero-form";

export default async function HeroEditPage() {
  const hero = await getContentRepository()
    .getHero()
    .catch(() => null);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Edit Hero Section</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Update the hero section displayed on the homepage.
      </p>
      <HeroForm initialData={hero} />
    </>
  );
}
