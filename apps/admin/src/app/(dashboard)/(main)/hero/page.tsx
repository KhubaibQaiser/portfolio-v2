import { createClient } from "@/lib/supabase/server";
import { getHero } from "@portfolio/shared/supabase/queries";
import { HeroForm } from "./hero-form";

export default async function HeroEditPage() {
  const client = await createClient();
  const hero = await getHero(client).catch(() => null);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Edit Hero Section</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update the hero section displayed on the homepage.
      </p>
      <HeroForm initialData={hero} />
    </>
  );
}
