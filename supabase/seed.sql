-- =============================================================================
-- Seed Data — Portfolio V2
-- Run with: supabase db reset (applies migrations then seed)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- site_config
-- ---------------------------------------------------------------------------
insert into public.site_config (name, email, location, title, description, social_links, nav_links)
values (
  'Khubaib Qaiser',
  'khubaib.dev@gmail.com',
  'Islamabad, Pakistan',
  'Senior Software Engineer',
  'Senior Software Engineer with 11+ years of experience specializing in React, Next.js, TypeScript, React Native, and cloud infrastructure (AWS, GCP). Available for senior/staff engineering roles, remote worldwide.',
  '[
    {"platform": "github",    "url": "https://github.com/khubaibqaiser",       "label": "GitHub"},
    {"platform": "linkedin",  "url": "https://linkedin.com/in/khubaib-qaiser", "label": "LinkedIn"},
    {"platform": "twitter",   "url": "https://twitter.com/khubaibqaiser",      "label": "Twitter"},
    {"platform": "instagram", "url": "https://instagram.com/khubaibqaiser",    "label": "Instagram"}
  ]'::jsonb,
  '[
    {"label": "About",      "href": "#about"},
    {"label": "Skills",     "href": "#skills"},
    {"label": "Experience", "href": "#experience"},
    {"label": "Projects",   "href": "#projects"},
    {"label": "Contact",    "href": "#contact"}
  ]'::jsonb
);

-- ---------------------------------------------------------------------------
-- hero
-- ---------------------------------------------------------------------------
insert into public.hero (greeting, name, headline, subtitle, value_proposition, cta_primary_text, cta_secondary_text)
values (
  'Hi, my name is',
  'Khubaib Qaiser',
  'I build things for the web & beyond.',
  ARRAY['Senior Software Engineer', 'React & TypeScript Expert', 'AWS Serverless Architect'],
  '11 years. 6 companies. 4 countries. I ship production systems that scale — from pixel-perfect React UIs to serverless AWS infrastructure.',
  'View My Work',
  'Download Resume'
);

-- ---------------------------------------------------------------------------
-- about
-- ---------------------------------------------------------------------------
insert into public.about (bio, photo_url, status, timezone, years_experience, companies_count, countries_count, projects_count, users_impacted, industries, languages)
values (
  E'I''m a Senior Software Engineer with over a decade of experience building high-performance web and mobile applications across Ad-Tech, E-Commerce, SaaS, and EdTech industries. Currently at Shopsense AI, where I architect serverless systems on AWS handling 50K+ daily ad impressions.\n\nMy expertise spans the full stack — from crafting pixel-perfect React interfaces to designing cloud infrastructure with AWS CDK, Lambda, and DynamoDB. I''ve led teams, built design systems used by 40+ engineers, and consistently delivered measurable performance improvements (60% CWV boost, 20%+ engagement increase).\n\nI use AI as a force multiplier — not a crutch. It helps me ship 3x faster while maintaining code quality I can defend in any review. This portfolio was built with AI assistance, and every line is production-grade.',
  '',
  'available',
  'GMT+5',
  11,
  6,
  4,
  30,
  '500K+',
  ARRAY['Ad-Tech', 'E-Commerce', 'SaaS', 'EdTech', 'FinTech'],
  ARRAY['English', 'Urdu']
);

-- ---------------------------------------------------------------------------
-- experience (sort_order 0 = most recent)
-- ---------------------------------------------------------------------------
insert into public.experience (company, role, location, location_type, contract_type, start_date, end_date, description, tech_tags, sort_order) values
(
  'Shopsense AI',
  'Senior Software Engineer',
  'San Francisco, CA',
  'remote',
  'full_time',
  'Aug 2024',
  null,
  E'Architected serverless ad delivery system with AWS CDK, Lambda, and DynamoDB handling 50K+ daily impressions\nBuilt real-time analytics pipeline with SQS and CloudFront, driving 20%+ engagement improvement\nDesigned and implemented scalable microservices for ad-tech platform serving enterprise clients',
  ARRAY['React', 'TypeScript', 'AWS CDK', 'Lambda', 'DynamoDB', 'SQS', 'CloudFront'],
  0
),
(
  'Achieve',
  'Senior Web Developer',
  'Jersey City, NJ',
  'remote',
  'full_time',
  'Jun 2023',
  'Aug 2024',
  E'Led CRA to Vite migration, reducing build times by 70% and improving developer experience\nImplemented React 18 features (Suspense, React Query) achieving 60% Core Web Vitals improvement\nMentored team of 5 on performance optimization best practices and modern React patterns',
  ARRAY['React 18', 'Vite', 'TypeScript', 'React Query', 'Suspense', 'Tailwind CSS'],
  1
),
(
  'Tradeblock.us',
  'Senior React Native Engineer',
  'Austin, TX',
  'remote',
  'full_time',
  'Jan 2023',
  'Jun 2023',
  E'Built cross-platform trading app with React Native, Next.js, and shared web/mobile codebase\nIntegrated Apollo GraphQL, Auth0, and Storybook for a cohesive full-stack development experience\nImplemented E2E testing with Detox (mobile) and Playwright (web) ensuring release stability',
  ARRAY['React Native', 'Next.js', 'Apollo GraphQL', 'Auth0', 'Storybook', 'Detox', 'Playwright'],
  2
),
(
  'GudangAda',
  'Senior Software Engineer',
  'Jakarta, Indonesia',
  'remote',
  'full_time',
  'Sep 2020',
  'Jan 2023',
  E'Created private npm design system adopted by 40+ engineers across 8 product teams\nBuilt company profile with Next.js + Contentful + Tailwind, achieving 70% Core Web Vitals improvement\nLed marketplace feature development for B2B e-commerce platform serving Indonesian market',
  ARRAY['React', 'Next.js', 'Contentful', 'Tailwind CSS', 'npm', 'TypeScript'],
  3
),
(
  'STOQO',
  'Senior Software Engineer',
  'Jakarta, Indonesia',
  'remote',
  'full_time',
  'Feb 2019',
  'Aug 2020',
  E'Built transport management dashboards and driver tracking system for logistics operations\nDeveloped React Native driver app and rewrote Android app in Kotlin for improved performance\nMentored junior engineers and established code review processes for the engineering team',
  ARRAY['React', 'React Native', 'Kotlin', 'Node.js', 'PostgreSQL'],
  4
),
(
  'Knowledge Platform',
  'Mobile App & Game Developer',
  'Islamabad, Pakistan',
  'onsite',
  'full_time',
  'Sep 2015',
  'Feb 2019',
  E'Developed educational games reaching 500K+ students across Pakistan and Middle East\nBuilt cross-platform mobile applications and interactive learning tools with HTML5 Canvas\nCreated survey application for CERP (Centre for Economic Research in Pakistan)',
  ARRAY['JavaScript', 'HTML5 Canvas', 'Cordova', 'Unity', 'EaselJS', 'SQLite'],
  5
);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
insert into public.projects (title, slug, description, summary, tech_tags, role, type, is_featured, sort_order) values
(
  'Shopsense AI Ad Platform',
  'shopsense-ai-ad-platform',
  'Serverless ad delivery system on AWS handling 50K+ daily impressions. Built with CDK, Lambda, DynamoDB, and SQS with real-time analytics via CloudFront.',
  'Serverless ad delivery system on AWS handling 50K+ daily impressions.',
  ARRAY['AWS CDK', 'Lambda', 'DynamoDB', 'SQS', 'React', 'TypeScript'],
  'Senior Software Engineer',
  'web',
  true,
  0
),
(
  'GudangAda Design System',
  'gudangada-design-system',
  'Private npm design system adopted by 40+ engineers across 8 product teams. Component library with Storybook documentation and automated visual regression testing.',
  'Private npm component library used by 40+ engineers across 8 teams.',
  ARRAY['React', 'TypeScript', 'Storybook', 'npm', 'styled-components'],
  'Senior Software Engineer',
  'web',
  true,
  1
),
(
  'Achieve Web Platform',
  'achieve-web-platform',
  'Enterprise financial wellness platform. Led CRA→Vite migration (70% faster builds) and React 18 upgrade achieving 60% Core Web Vitals improvement.',
  'Financial wellness platform with React 18 and 60% CWV improvement.',
  ARRAY['React 18', 'Vite', 'TypeScript', 'React Query', 'Tailwind CSS'],
  'Senior Web Developer',
  'web',
  true,
  2
),
(
  'GudangAda Company Profile',
  'gudangada-company-profile',
  'Public-facing company website built with Next.js, Contentful CMS, and Tailwind CSS. Achieved 70% improvement in Core Web Vitals with SSG and ISR.',
  'Next.js + Contentful website with 70% Core Web Vitals improvement.',
  ARRAY['Next.js', 'Contentful', 'Tailwind CSS', 'TypeScript', 'Vercel'],
  'Senior Software Engineer',
  'web',
  true,
  3
),
(
  'Tradeblock Trading App',
  'tradeblock-trading-app',
  'Cross-platform sneaker trading app with shared React Native + web codebase.',
  'Cross-platform sneaker trading app with shared React Native + web codebase.',
  ARRAY['React Native', 'Next.js', 'Apollo GraphQL'],
  'Senior React Native Engineer',
  'mobile',
  false,
  4
),
(
  'STOQO Driver App',
  'stoqo-driver-app',
  'React Native driver tracking app, later rewritten in native Kotlin.',
  'React Native driver tracking app, later rewritten in native Kotlin.',
  ARRAY['React Native', 'Kotlin', 'Google Maps'],
  'Senior Software Engineer',
  'mobile',
  false,
  5
),
(
  'Transport Management System',
  'transport-management-system',
  'Dashboard for logistics operations with real-time driver tracking.',
  'Dashboard for logistics operations with real-time driver tracking.',
  ARRAY['React', 'Node.js', 'PostgreSQL', 'Maps'],
  'Senior Software Engineer',
  'web',
  false,
  6
),
(
  'Geo Dashboard',
  'geo-dashboard',
  'Geographic data visualization dashboard with interactive maps.',
  'Geographic data visualization dashboard with interactive maps.',
  ARRAY['React', 'D3.js', 'Leaflet', 'Node.js'],
  'Software Engineer',
  'web',
  false,
  7
),
(
  'CERP Survey App',
  'cerp-survey-app',
  'Cross-platform survey application for economic research in Pakistan.',
  'Cross-platform survey application for economic research in Pakistan.',
  ARRAY['Cordova', 'JavaScript', 'SQLite'],
  'Mobile App Developer',
  'mobile',
  false,
  8
),
(
  'Martian Multiples',
  'martian-multiples',
  'Educational math game reaching 500K+ students across Pakistan.',
  'Educational math game reaching 500K+ students across Pakistan.',
  ARRAY['EaselJS', 'HTML5 Canvas', 'JavaScript'],
  'Game Developer',
  'game',
  false,
  9
),
(
  'Maze Runner',
  'maze-runner',
  'Interactive educational puzzle game for K-12 students.',
  'Interactive educational puzzle game for K-12 students.',
  ARRAY['HTML5 Canvas', 'JavaScript', 'EaselJS'],
  'Game Developer',
  'game',
  false,
  10
),
(
  'Number Battle',
  'number-battle',
  'Competitive math game for classroom learning environments.',
  'Competitive math game for classroom learning environments.',
  ARRAY['EaselJS', 'HTML5 Canvas', 'JavaScript'],
  'Game Developer',
  'game',
  false,
  11
);

-- ---------------------------------------------------------------------------
-- skills
-- ---------------------------------------------------------------------------
insert into public.skills (name, category, proficiency, years, sort_order) values
-- frontend
('React 18',       'frontend', 95, 8, 0),
('Next.js',        'frontend', 92, 5, 1),
('TypeScript',     'frontend', 93, 6, 2),
('Tailwind CSS',   'frontend', 90, 4, 3),
('HTML5/CSS3',     'frontend', 95, 11, 4),
('Framer Motion',  'frontend', 80, 2, 5),
-- mobile
('React Native',   'mobile', 88, 5, 0),
('Expo',           'mobile', 82, 3, 1),
('Kotlin',         'mobile', 55, 2, 2),
-- backend
('Node.js',        'backend', 85, 7, 0),
('REST API',       'backend', 90, 9, 1),
('GraphQL',        'backend', 78, 3, 2),
-- cloud
('AWS Lambda',     'cloud', 82, 3, 0),
('AWS CDK',        'cloud', 78, 2, 1),
('DynamoDB',       'cloud', 75, 2, 2),
('S3 / CloudFront','cloud', 80, 3, 3),
('Firebase',       'cloud', 75, 4, 4),
('Vercel',         'cloud', 88, 4, 5),
-- state
('Redux / RTK',    'state', 88, 6, 0),
('TanStack Query', 'state', 85, 3, 1),
('Zustand',        'state', 80, 2, 2),
('Apollo GraphQL', 'state', 75, 2, 3),
-- devops
('Docker',         'devops', 70, 3, 0),
('GitHub Actions', 'devops', 82, 4, 1),
('Sentry',         'devops', 78, 3, 2),
-- testing
('Jest / RTL',     'testing', 80, 5, 0),
('Playwright',     'testing', 70, 2, 1),
('Detox',          'testing', 65, 1, 2),
-- tools
('Storybook',      'tools', 78, 4, 0),
('Figma',          'tools', 72, 3, 1),
('Linear / JIRA',  'tools', 85, 8, 2);

-- ---------------------------------------------------------------------------
-- testimonials
-- ---------------------------------------------------------------------------
insert into public.testimonials (quote, author_name, author_title, company, sort_order) values
(
  'Khubaib is one of the most skilled frontend engineers I''ve worked with. He took ownership of our ad delivery platform and delivered a production-grade system that handles tens of thousands of impressions daily.',
  'Alex Rivera',
  'CTO',
  'Shopsense AI',
  0
),
(
  'His work on migrating our legacy CRA apps to Vite was flawless. Build times dropped by 70% and developer satisfaction went through the roof. Khubaib consistently ships high-quality, well-tested code.',
  'Sarah Chen',
  'Engineering Manager',
  'Achieve',
  1
),
(
  'Khubaib created our entire design system from scratch as a private npm package. It unified the UI across 8 teams and 40+ engineers. His attention to DX and component API design is exceptional.',
  'Adi Prasetyo',
  'VP of Engineering',
  'GudangAda',
  2
);

-- ---------------------------------------------------------------------------
-- resume
-- ---------------------------------------------------------------------------
insert into public.resume (default_summary, education, certifications, visible_sections, is_projects_visible)
values (
  'Senior Software Engineer with 11+ years of experience in Ad-Tech, E-Commerce, SaaS, and EdTech. Specialized in React, Next.js, TypeScript, and AWS Serverless (Lambda, CDK, DynamoDB). Proven track record of driving 50K+ daily impressions, 60% Core Web Vitals improvement, and leading cross-functional teams across 6 companies spanning 4 countries. I leverage AI as a force multiplier to ship faster while maintaining production-grade quality.',
  '[
    {"degree": "BS Computer Science", "institution": "Quaid-i-Azam University, Islamabad", "year": "2015", "url": null}
  ]'::jsonb,
  '[
    {"name": "HackerRank — Problem Solving (Advanced)", "issuer": "HackerRank", "url": null},
    {"name": "HackerRank — JavaScript (Intermediate)", "issuer": "HackerRank", "url": null},
    {"name": "HackerRank — REST API (Intermediate)", "issuer": "HackerRank", "url": null},
    {"name": "HackerRank — React (Basic)", "issuer": "HackerRank", "url": null}
  ]'::jsonb,
  '["experience", "skills", "education", "certifications"]'::jsonb,
  true
);
