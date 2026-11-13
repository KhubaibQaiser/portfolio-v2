import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProjectCard } from "@/components/projects/project-card";
import { projectFixtures } from "../../../../packages/data/src/fixtures/content";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const base = {
  ...projectFixtures[0]!,
  slug: "demo",
  title: "Demo project",
  summary: "Short summary.",
  type: "web" as const,
  github_url: null,
  live_url: null,
  tech_tags: ["a", "b"],
};
const render = (over: object) =>
  renderToStaticMarkup(<ProjectCard project={{ ...base, ...over }} />);

describe("ProjectCard", () => {
  it("shows the cover image when there is one", () => {
    const html = render({ cover_url: "https://media.example.com/cover.png" });
    expect(html).toContain('src="https://media.example.com/cover.png"');
  });

  it("falls back to a placeholder, with no image, when there is no cover", () => {
    const html = render({ cover_url: null });
    expect(html).not.toContain("<img");
    expect(html).toContain("from-accent/15");
  });

  it("links the title to the detail page and shows summary, not description", () => {
    const html = render({ cover_url: null, description: "LONG description text" });
    expect(html).toContain('href="/projects/demo"');
    expect(html).toContain("Short summary.");
    expect(html).not.toContain("LONG description text");
  });

  it("caps the stack chips at four and counts the rest", () => {
    const html = render({ tech_tags: ["a", "b", "c", "d", "e", "f"] });
    expect(html).toContain(">+2<");
    expect(html).not.toContain(">e<");
  });

  it("keeps GitHub and live links as separate external links", () => {
    const html = render({
      github_url: "https://github.com/x/y",
      live_url: "https://example.com",
    });
    expect(html).toContain('href="https://github.com/x/y"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
