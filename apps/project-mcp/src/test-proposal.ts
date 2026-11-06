import type { ProposeProjectInput } from "./tools/propose-project";

/** Minimal valid `propose_project` arguments with a unique slug (fixture repo is process-shared). */
export function proposal(slug = `p-${crypto.randomUUID().slice(0, 8)}`): ProposeProjectInput {
  return {
    title: "Test project",
    slug,
    description: "Description",
    summary: "Summary",
    cover_url: null,
    tech_tags: ["typescript"],
    role: "Engineer",
    type: "web",
    github_url: null,
    live_url: null,
    playstore_url: null,
    appstore_url: null,
    resume_status: null,
    resume_description: "",
  };
}
