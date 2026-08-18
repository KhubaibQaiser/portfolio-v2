import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero";
import { AboutSection } from "@/components/sections/about";
import { WhyHireMeSection } from "@/components/sections/why-hire-me";
import { SkillsSection } from "@/components/sections/skills";
import { ExperienceSection } from "@/components/sections/experience";
import { FeaturedProjectsSection } from "@/components/sections/featured-projects";
import { ContactSection } from "@/components/sections/contact";
import { Testimonials } from "@/components/sections/testimonials";
import { StatDivider } from "@/components/sections/stat-divider";
import { BuiltWithSection } from "@/components/sections/built-with";
import {
  fetchHero,
  fetchAbout,
  fetchExperience,
  fetchFeaturedProjects,
  fetchSkills,
  fetchTestimonials,
  fetchSiteConfig,
} from "@/lib/data";
import { uniqueCompanyCount } from "@portfolio/shared/experience-stats";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 10;

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

export default async function HomePage() {
  const [hero, about, experience, featuredProjects, skills, testimonials, siteConfig] =
    await Promise.all([
      fetchHero(),
      fetchAbout(),
      fetchExperience(),
      fetchFeaturedProjects(),
      fetchSkills(),
      fetchTestimonials(),
      fetchSiteConfig(),
    ]);

  const companies = experience.map((e) => e.company);
  const companiesCount = uniqueCompanyCount(experience);

  return (
    <>
      <HeroSection hero={hero} name={siteConfig.name} companies={companies} />
      <AboutSection
        about={about}
        location={siteConfig.location}
        companiesCount={companiesCount}
        name={siteConfig.name}
      />
      <Testimonials testimonials={testimonials} />
      <WhyHireMeSection highlights={about.highlights} />
      <StatDivider
        stat={`${about.years_experience}+`}
        label="Years of shipping production code"
        variant="gradient"
      />
      <SkillsSection skills={skills} />
      <StatDivider
        stat={String(companiesCount)}
        label={`Companies across ${about.countries_count} countries`}
        variant="subtle"
      />
      <ExperienceSection experience={experience} />
      {/* <StatDivider
        stat={about.users_impacted}
        label="Users impacted by my work"
        variant="accent"
      /> */}
      <FeaturedProjectsSection projects={featuredProjects} />
      <BuiltWithSection techStack={siteConfig.tech_stack} />
      <ContactSection email={siteConfig.email} />
    </>
  );
}
