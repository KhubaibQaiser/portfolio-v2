# khubaibqaiser.com — Portfolio V2

The personal portfolio and admin dashboard for [Khubaib Qaiser](https://khubaibqaiser.com), Senior Software Engineer with 11+ years of experience across Ad-Tech, E-Commerce, SaaS, and EdTech.

Built as a production-grade monorepo with a public-facing portfolio, a private admin CMS, and shared packages — deployed on Vercel's edge network with a $0/month infrastructure cost.

## Live

| App | URL | Purpose |
|-----|-----|---------|
| Portfolio | [khubaibqaiser.com](https://khubaibqaiser.com) | Public portfolio site |
| Admin | [admin.khubaibqaiser.com](https://admin.khubaibqaiser.com) | Content management dashboard |
| Storybook | [storybook.khubaibqaiser.com](https://storybook.khubaibqaiser.com) | Design system documentation |

## Tech Stack

### Core

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, RSC, PPR) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19 |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Components | shadcn/ui (Radix primitives) via `@portfolio/ui` |
| Monorepo | Turborepo + pnpm workspaces |

### Frontend (Portfolio)

| Feature | Technology |
|---------|------------|
| Animations | Framer Motion + GSAP (ScrollTrigger) |
| Smooth Scroll | Lenis |
| 3D | React Three Fiber + drei |
| Data Viz | Recharts + D3.js |
| AI Chat | Vercel AI SDK + Groq (Llama 4 Scout) |
| Theme | next-themes (light/dark/system, zero flash) |
| Command Palette | cmdk |
| Resume PDF | @react-pdf/renderer (server-side) |
| Forms | React Hook Form + Zod |

### Backend & Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| Hosting | Vercel (Hobby) | Edge CDN, ISR, image optimization |
| Database | Supabase PostgreSQL | Content storage, auth, pgvector embeddings |
| Cache | Upstash Redis | Rate limiting, API caching, visitor counter |
| Email | Resend | Contact form transactional email |
| Object Storage | Cloudflare R2 | Resume PDFs, project images |
| Bot Protection | Cloudflare Turnstile | CAPTCHA-free form protection |
| LLM Inference | Groq | AI chat (Llama 4 Scout, ~280-560 tok/s) |
| Embeddings | Cloudflare Workers AI | RAG vector generation |
| Analytics | PostHog + Vercel Analytics | Events, funnels, Core Web Vitals |
| Error Tracking | Sentry | Error monitoring, performance tracing |
| CI/CD | GitHub Actions + Vercel Git | Lint, typecheck, build, preview deploys |

### Auth (Admin)

| Layer | Mechanism |
|-------|-----------|
| Primary | Google SSO via Supabase Auth |
| Fallback | Magic link (passwordless email) |
| Enforcement | Shared email allowlist across middleware, auth callback, and RLS |

## Project Structure

```
portfolio-v2/
├── apps/
│   ├── web/                    # Public portfolio — khubaibqaiser.com
│   │   └── src/
│   │       ├── app/            # Next.js App Router (pages, API routes, metadata)
│   │       ├── components/     # UI sections, layout, 3D, charts, chat
│   │       ├── lib/            # Supabase, Redis, Resend, AI, env validation
│   │       ├── hooks/          # Custom React hooks
│   │       └── styles/         # Tailwind globals, font config
│   │
│   └── admin/                  # Admin dashboard — admin.khubaibqaiser.com
│       └── src/
│           ├── app/            # Dashboard pages, login, auth callback
│           ├── components/     # Editor, forms, layout (sidebar, nav)
│           ├── lib/            # Supabase client (browser + server), R2 upload
│           └── middleware.ts   # Auth guard (session + email allowlist check)
│
├── packages/
│   ├── shared/                 # Shared between web + admin
│   │   └── src/
│   │       ├── types/          # Content type definitions (hero, project, skill, etc.)
│   │       ├── schemas/        # Zod validation schemas (forms + API)
│   │       ├── supabase/       # Client factory, auto-generated database types
│   │       └── constants.ts    # Site config, admin allowlist, enums
│   │
│   ├── ui/                     # Shared design system
│   │   └── src/                # Theme provider, toggle, button, input, card, badge
│   │
│   └── eslint-config/          # Shared ESLint configuration
│
├── .github/workflows/ci.yml   # CI pipeline (lint, typecheck, build, Lighthouse)
├── turbo.json                  # Turborepo task graph
└── pnpm-workspace.yaml         # Workspace definition
```

### Workspace Packages

| Package | Name | Description |
|---------|------|-------------|
| `apps/web` | `@portfolio/web` | Public portfolio (port 3000) |
| `apps/admin` | `@portfolio/admin` | Admin CMS dashboard (port 3001) |
| `packages/shared` | `@portfolio/shared` | Types, Zod schemas, Supabase client, constants |
| `packages/ui` | `@portfolio/ui` | Design system components + Storybook |
| `packages/eslint-config` | `@portfolio/eslint-config` | Shared ESLint rules |

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** 10.x (`corepack enable` to use the version pinned in `package.json`)
- A **Supabase** project (free tier)
- Optional: Groq, Cloudflare, Upstash, Resend, PostHog, Sentry accounts (all free tier)

### Installation

```bash
git clone https://github.com/khubaibqaiser/portfolio-v2.git
cd portfolio-v2
pnpm install
```

### Environment Variables

Each app has its own `.env.example` with only the variables it needs. Copy and fill in:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

**`apps/web`** (portfolio) — 20 variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public site URL |
| `REVALIDATE_SECRET` | Yes | Shared secret for ISR revalidation webhook |
| `GROQ_API_KEY` | No | Groq API key for AI chat |
| `GITHUB_TOKEN` | No | GitHub PAT for stats API |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis token |
| `RESEND_API_KEY` | No | Resend API key for contact form emails |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | No | Cloudflare Turnstile secret |
| `CLOUDFLARE_ACCOUNT_ID` | No | Workers AI account ID |
| `CLOUDFLARE_API_TOKEN` | No | Workers AI API token |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog host URL |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN |
| `SENTRY_ORG` | No | Sentry organization slug |
| `SENTRY_PROJECT` | No | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token (source maps) |

**`apps/admin`** (dashboard) — 2 variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key |

**`packages/ui`** (Storybook) — no environment variables needed.

The web app uses `@t3-oss/env-nextjs` for runtime validation. Set `SKIP_ENV_VALIDATION=1` to bypass during CI builds or initial setup.

### Development

```bash
# Run both apps concurrently
pnpm dev

# Run only the portfolio
pnpm dev:web

# Run only the admin dashboard
pnpm dev:admin

# Run Storybook (design system)
pnpm storybook
```

- Portfolio: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3001](http://localhost:3001)
- Storybook: [http://localhost:6006](http://localhost:6006)

### Build

```bash
pnpm build              # Build all apps (Turborepo-cached)
pnpm build-storybook    # Build Storybook static site
pnpm lint               # ESLint across all packages
pnpm typecheck          # TypeScript strict checking
pnpm format             # Prettier formatting
pnpm format:check       # Check formatting without writing
```

## Deployment

All three apps are deployed as separate Vercel projects from the same repository.

### Vercel Setup

1. Import the repository into Vercel
2. Create three projects:

   | Project | Root Directory | Build Command | Output Directory | Domain |
   |---------|---------------|---------------|-----------------|--------|
   | Portfolio | `apps/web` | (auto-detected) | (auto-detected) | `khubaibqaiser.com` |
   | Admin | `apps/admin` | (auto-detected) | (auto-detected) | `admin.khubaibqaiser.com` |
   | Storybook | `packages/ui` | `pnpm build-storybook` | `storybook-static` | `storybook.khubaibqaiser.com` |

3. For the **Storybook** project, set Framework Preset to **Other** (it is a static site, not Next.js)
4. Add environment variables to the Portfolio and Admin projects via the Vercel dashboard
5. Vercel auto-detects Turborepo and only rebuilds the project whose dependencies changed

### CI Pipeline

GitHub Actions runs on every push to `main` and every pull request:

1. **Lint** — ESLint across all packages
2. **Type check** — `tsc --noEmit` across all packages
3. **Build** — Full production build (Turborepo-cached)
4. **Lighthouse CI** — Performance audit on PRs (web app only)

All environment variables in CI come from **GitHub Variables** (Settings > Secrets and variables > Actions). No secrets are hardcoded in the workflow.

### Required GitHub Variables

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://khubaibqaiser.com` |

### Supabase Setup

1. Create a Supabase project
2. Run the database migrations to create content tables
3. Enable Google as an OAuth provider (Authentication > Providers)
4. Add redirect URLs for both production and local dev
5. Configure RLS policies to restrict writes to allowlisted admin emails

## Architecture Highlights

- **Partial Prerendering (PPR)**: Static HTML shell served from edge CDN (~50ms TTFB), dynamic parts stream in via Suspense
- **React Server Components**: Zero client JS for content sections — only interactive parts hydrate
- **ISR + On-Demand Revalidation**: Content cached at the edge, busted in <5 seconds when admin saves changes
- **RAG-Powered AI Chat**: Portfolio content chunked, embedded via Cloudflare Workers AI, stored in pgvector, queried at chat time with Groq inference
- **ATS Resume Generation**: Server-side PDF via `@react-pdf/renderer` pulling live data from Supabase — always up to date
- **Multi-Layer Auth**: Google SSO + magic link fallback, enforced via database trigger, RLS policies, Next.js middleware, and auth callback — all checking a shared email allowlist

## Performance Targets

| Metric | Target |
|--------|--------|
| TTFB | < 100ms |
| FCP | < 500ms |
| LCP | < 1.0s |
| INP | < 50ms |
| CLS | < 0.01 |
| Lighthouse | 100/100/100/100 |
| First Load JS | < 150 KB gzipped |

## Author

**Khubaib Qaiser**
- [khubaibqaiser.com](https://khubaibqaiser.com)
- [github.com/khubaibqaiser](https://github.com/khubaibqaiser)
- [linkedin.com/in/khubaib-qaiser](https://linkedin.com/in/khubaib-qaiser)
- khubaib.dev@gmail.com

## License

This project is proprietary. All rights reserved. See [LICENSE](./LICENSE) for details.
