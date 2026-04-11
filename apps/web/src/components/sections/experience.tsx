"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

type ExperienceEntry = {
  company: string;
  role: string;
  location: string;
  type: string;
  period: string;
  description: string[];
  tech: string[];
};

const experiences: ExperienceEntry[] = [
  {
    company: "Shopsense AI",
    role: "Senior Software Engineer",
    location: "San Francisco, CA",
    type: "Remote",
    period: "Aug 2024 – Present",
    description: [
      "Architected serverless ad delivery system with AWS CDK, Lambda, and DynamoDB handling 50K+ daily impressions",
      "Built real-time analytics pipeline with SQS and CloudFront, driving 20%+ engagement improvement",
      "Designed and implemented scalable microservices for ad-tech platform serving enterprise clients",
    ],
    tech: ["React", "TypeScript", "AWS CDK", "Lambda", "DynamoDB", "SQS", "CloudFront"],
  },
  {
    company: "Achieve",
    role: "Senior Web Developer",
    location: "Jersey City, NJ",
    type: "Remote",
    period: "Jun 2023 – Aug 2024",
    description: [
      "Led CRA to Vite migration, reducing build times by 70% and improving developer experience",
      "Implemented React 18 features (Suspense, React Query) achieving 60% Core Web Vitals improvement",
      "Mentored team of 5 on performance optimization best practices and modern React patterns",
    ],
    tech: ["React 18", "Vite", "TypeScript", "React Query", "Suspense", "Tailwind CSS"],
  },
  {
    company: "Tradeblock.us",
    role: "Senior React Native Engineer",
    location: "Austin, TX",
    type: "Remote",
    period: "Jan 2023 – Jun 2023",
    description: [
      "Built cross-platform trading app with React Native, Next.js, and shared web/mobile codebase",
      "Integrated Apollo GraphQL, Auth0, and Storybook for a cohesive full-stack development experience",
      "Implemented E2E testing with Detox (mobile) and Playwright (web) ensuring release stability",
    ],
    tech: ["React Native", "Next.js", "Apollo GraphQL", "Auth0", "Storybook", "Detox", "Playwright"],
  },
  {
    company: "GudangAda",
    role: "Senior Software Engineer",
    location: "Jakarta, Indonesia",
    type: "Remote",
    period: "Sep 2020 – Jan 2023",
    description: [
      "Created private npm design system adopted by 40+ engineers across 8 product teams",
      "Built company profile with Next.js + Contentful + Tailwind, achieving 70% Core Web Vitals improvement",
      "Led marketplace feature development for B2B e-commerce platform serving Indonesian market",
    ],
    tech: ["React", "Next.js", "Contentful", "Tailwind CSS", "npm", "TypeScript"],
  },
  {
    company: "STOQO",
    role: "Senior Software Engineer",
    location: "Jakarta, Indonesia",
    type: "Remote",
    period: "Feb 2019 – Aug 2020",
    description: [
      "Built transport management dashboards and driver tracking system for logistics operations",
      "Developed React Native driver app and rewrote Android app in Kotlin for improved performance",
      "Mentored junior engineers and established code review processes for the engineering team",
    ],
    tech: ["React", "React Native", "Kotlin", "Node.js", "PostgreSQL"],
  },
  {
    company: "Knowledge Platform",
    role: "Mobile App & Game Developer",
    location: "Islamabad, Pakistan",
    type: "On-site",
    period: "Sep 2015 – Feb 2019",
    description: [
      "Developed educational games reaching 500K+ students across Pakistan and Middle East",
      "Built cross-platform mobile applications and interactive learning tools with HTML5 Canvas",
      "Created survey application for CERP (Centre for Economic Research in Pakistan)",
    ],
    tech: ["JavaScript", "HTML5 Canvas", "Cordova", "Unity", "EaselJS", "SQLite"],
  },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function ExperienceSection() {
  return (
    <section
      id="experience"
      className="py-[var(--section-padding-y)]"
      aria-label="Experience"
    >
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-padding)]">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="flex items-center gap-3 text-[length:var(--text-h2)] font-semibold tracking-tight">
            <span className="font-mono text-base font-normal text-accent">
              03.
            </span>
            Where I&apos;ve Worked
            <span className="ml-4 h-px flex-1 bg-border" aria-hidden />
          </h2>

          <div className="relative mt-10">
            {/* Timeline line */}
            <div
              className="absolute left-4 top-0 hidden h-full w-px bg-border md:left-8 md:block"
              aria-hidden
            />

            <div className="space-y-10">
              {experiences.map((exp, i) => (
                <motion.div
                  key={`${exp.company}-${exp.period}`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    delay: i * 0.05,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1] as const,
                  }}
                  className="relative pl-0 md:pl-20"
                >
                  {/* Timeline dot */}
                  <div
                    className="absolute left-2.5 top-2 hidden h-3 w-3 rounded-full border-2 border-accent bg-background md:left-6.5 md:block"
                    aria-hidden
                  />

                  <div className="rounded-xl border border-border/50 bg-muted/20 p-6 transition-all duration-200 hover:border-accent/20 hover:shadow-sm">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{exp.role}</h3>
                        <p className="text-accent">{exp.company}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-mono">{exp.period}</span>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {exp.location}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {exp.type}
                      </span>
                    </div>

                    <ul className="mt-4 space-y-2">
                      {exp.description.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {exp.tech.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-xs text-accent"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
