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

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <WhyHireMeSection />
      <ParallaxDivider
        stat="11+"
        label="Years of shipping production code"
        variant="gradient"
      />
      <SkillsSection />
      <ParallaxDivider
        stat="6"
        label="Companies across 4 countries"
        variant="subtle"
      />
      <ExperienceSection />
      <ParallaxDivider
        stat="500K+"
        label="Users impacted by my work"
        variant="accent"
      />
      <FeaturedProjectsSection />
      <Testimonials />
      <BuiltWithSection />
      <ContactSection />
    </>
  );
}
