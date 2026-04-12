import { HeroSection } from "@/components/sections/hero";
import { AboutSection } from "@/components/sections/about";
import { WhyHireMeSection } from "@/components/sections/why-hire-me";
import { SkillsSection } from "@/components/sections/skills";
import { ExperienceSection } from "@/components/sections/experience";
import { FeaturedProjectsSection } from "@/components/sections/featured-projects";
import { ContactSection } from "@/components/sections/contact";
import { Testimonials } from "@/components/sections/testimonials";
import { ParallaxDivider } from "@portfolio/ui/parallax-divider";
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
      <HeroSection hero={hero} companies={companies} />
      <AboutSection about={about} location={siteConfig.location} companiesCount={companiesCount} />
      <WhyHireMeSection />
      <ParallaxDivider
        stat={`${about.years_experience}+`}
        label="Years of shipping production code"
        variant="gradient"
      />
      <SkillsSection skills={skills} />
      <ParallaxDivider
        stat={String(companiesCount)}
        label={`Companies across ${about.countries_count} countries`}
        variant="subtle"
      />
      <ExperienceSection experience={experience} />
      <ParallaxDivider
        stat={about.users_impacted}
        label="Users impacted by my work"
        variant="accent"
      />
      <FeaturedProjectsSection projects={featuredProjects} />
      <Testimonials testimonials={testimonials} />
      <BuiltWithSection />
      <ContactSection email={siteConfig.email} />
    </>
  );
}
