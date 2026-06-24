import { getContentRepository } from "@portfolio/data";
import { TestimonialsList } from "./testimonials-list";

export default async function TestimonialsPage() {
  const testimonials = await getContentRepository()
    .getTestimonials()
    .catch(() => []);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Testimonials</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage quotes from colleagues and leaders.
          </p>
        </div>
      </div>
      <TestimonialsList initialData={testimonials} />
    </>
  );
}
