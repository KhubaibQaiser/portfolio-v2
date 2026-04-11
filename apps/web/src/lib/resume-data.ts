import { SITE, SOCIAL_LINKS } from "@portfolio/shared/constants";

export type ResumeData = {
  name: string;
  title: string;
  email: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  summary: string;
  experience: {
    company: string;
    role: string;
    period: string;
    location: string;
    bullets: string[];
    tech: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  certifications: string[];
  skills: {
    category: string;
    items: string[];
  }[];
};

export function getResumeData(): ResumeData {
  return {
    name: SITE.name,
    title: SITE.title,
    email: SITE.email,
    location: SITE.location,
    website: "khubaibqaiser.com",
    linkedin: SOCIAL_LINKS.linkedin.replace("https://", ""),
    github: SOCIAL_LINKS.github.replace("https://", ""),
    summary:
      "Senior Software Engineer with 11+ years of experience in Ad-Tech, E-Commerce, SaaS, and EdTech. " +
      "Specialized in React, Next.js, TypeScript, and AWS Serverless (Lambda, CDK, DynamoDB). " +
      "Proven track record of driving 50K+ daily impressions, 60% Core Web Vitals improvement, " +
      "and leading cross-functional teams across 6 companies spanning 4 countries. " +
      "I leverage AI as a force multiplier to ship faster while maintaining production-grade quality.",
    experience: [
      {
        company: "Shopsense AI",
        role: "Senior Software Engineer",
        period: "Aug 2024 – Present",
        location: "San Francisco, CA (Remote)",
        bullets: [
          "Architected serverless ad delivery system with AWS CDK, Lambda, and DynamoDB handling 50K+ daily impressions with sub-100ms p99 latency",
          "Built real-time analytics pipeline using SQS, CloudFront, and custom ETL, driving 20%+ engagement improvement",
          "Developed AI-powered ad platform frontend with React 19, TypeScript, and TanStack Query for real-time campaign management",
        ],
        tech: "React, TypeScript, AWS CDK, Lambda, DynamoDB, SQS, CloudFront, TanStack Query",
      },
      {
        company: "Achieve",
        role: "Senior Web Developer",
        period: "Jun 2023 – Aug 2024",
        location: "Jersey City, NJ (Remote)",
        bullets: [
          "Led CRA to Vite migration across 3 micro-frontends, reducing build times by 70% and improving DX significantly",
          "Implemented React 18 concurrent features (Suspense boundaries, startTransition) achieving 60% Core Web Vitals improvement",
          "Drove TanStack Query adoption replacing Redux Saga, reducing boilerplate by 40% and API-related bugs by 65%",
        ],
        tech: "React 18, Vite, TypeScript, React Query, Tailwind CSS, Micro-frontends",
      },
      {
        company: "Tradeblock.us",
        role: "Senior React Native Engineer",
        period: "Jan 2023 – Jun 2023",
        location: "Austin, TX (Remote)",
        bullets: [
          "Built cross-platform trading app with React Native + Next.js shared codebase serving 10K+ active traders",
          "Integrated Apollo GraphQL, Auth0 SSO, Storybook component library, and end-to-end testing with Detox and Playwright",
        ],
        tech: "React Native, Next.js, Apollo GraphQL, Auth0, Storybook, Detox, Playwright",
      },
      {
        company: "GudangAda",
        role: "Senior Software Engineer",
        period: "Sep 2020 – Jan 2023",
        location: "Jakarta, Indonesia (Remote)",
        bullets: [
          "Created private npm design system package used by 40+ engineers across 8 teams, establishing company-wide UI consistency",
          "Built company profile with Next.js SSG + Contentful CMS achieving 70% Core Web Vitals improvement and SEO rankings lift",
          "Led code-splitting initiative reducing main bundle size by 55% across buyer and seller dashboards",
        ],
        tech: "React, Next.js, Contentful, Tailwind CSS, npm packages, Storybook",
      },
      {
        company: "STOQO",
        role: "Senior Software Engineer",
        period: "Feb 2019 – Aug 2020",
        location: "Jakarta, Indonesia (Remote)",
        bullets: [
          "Built transport management dashboards and real-time driver tracking system with React + Google Maps API",
          "Developed React Native driver app and rewrote legacy Android app in Kotlin, improving crash-free rate to 99.5%",
        ],
        tech: "React, React Native, Kotlin, Node.js, PostgreSQL, Google Maps API",
      },
      {
        company: "Knowledge Platform",
        role: "Mobile App & Game Developer",
        period: "Sep 2015 – Feb 2019",
        location: "Islamabad, Pakistan",
        bullets: [
          "Developed 15+ educational games and apps reaching 500K+ students across Pakistan and Southeast Asia",
          "Built cross-platform mobile apps with Cordova and interactive HTML5 Canvas games with EaselJS",
        ],
        tech: "JavaScript, HTML5 Canvas, Cordova, Unity, EaselJS, Android SDK",
      },
    ],
    education: [
      {
        degree: "BS Computer Science",
        institution: "Quaid-i-Azam University, Islamabad",
        year: "2015",
      },
    ],
    certifications: [
      "HackerRank — Problem Solving (Advanced)",
      "HackerRank — JavaScript (Intermediate)",
      "HackerRank — REST API (Intermediate)",
      "HackerRank — React (Basic)",
    ],
    skills: [
      {
        category: "Frontend",
        items: [
          "React 19", "Next.js 15", "TypeScript", "Tailwind CSS", "Framer Motion",
          "Vite", "Webpack", "Storybook", "shadcn/ui", "Radix UI",
        ],
      },
      {
        category: "Mobile",
        items: ["React Native", "Expo", "Kotlin", "Android SDK"],
      },
      {
        category: "Backend & Cloud",
        items: [
          "Node.js", "Express", "AWS (Lambda, CDK, DynamoDB, SQS, S3, CloudFront)",
          "Supabase", "PostgreSQL", "Redis", "REST APIs", "GraphQL",
        ],
      },
      {
        category: "DevOps & Tools",
        items: [
          "Git", "GitHub Actions", "Docker", "Vercel", "Sentry",
          "ESLint", "Prettier", "Turborepo", "pnpm",
        ],
      },
      {
        category: "Testing",
        items: ["Jest", "React Testing Library", "Playwright", "Detox", "Cypress"],
      },
    ],
  };
}
