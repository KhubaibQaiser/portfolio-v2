import { createClient } from "@/lib/supabase/server";
import { getTestimonials } from "@portfolio/shared/supabase/queries";
import { TestimonialsList } from "./testimonials-list";

export default async function TestimonialsPage() {
  const client = await createClient();
  const testimonials = await getTestimonials(client).catch(() => []);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Testimonials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage quotes from colleagues and leaders.
          </p>
        </div>
      </div>
      <TestimonialsList initialData={testimonials} />
    </>
  );
}
