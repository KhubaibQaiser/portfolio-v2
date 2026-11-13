import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeaturedProjectsSection } from "@/components/sections/featured-projects";
import { projectFixtures } from "../../../../packages/data/src/fixtures/content";

describe("FeaturedProjectsSection", () => {
  it("shows the short summary on the card, never the long description", () => {
    const project = {
      ...projectFixtures[0]!,
      cover_url: null,
      summary: "Short summary for the card.",
      description: "A very long description that belongs on the detail page only.",
    };

    const html = renderToStaticMarkup(<FeaturedProjectsSection projects={[project]} />);

    expect(html).toContain("Short summary for the card.");
    expect(html).not.toContain("very long description");
  });
});
