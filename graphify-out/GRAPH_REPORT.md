# Graph Report - workspace  (2026-09-09)

## Corpus Check
- 666 files · ~240,314 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3397 nodes · 7712 edges · 170 communities (151 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9f9229a1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- job-feeds/index.ts
- shared/src/schemas/index.ts
- chat/route.ts
- export/route.ts
- ats/route.ts
- protocol-era.integration.test.ts
- cn
- fetchSiteConfig
- icons/index.ts
- web/package.json
- multi-table-content-repository.ts
- candidate-mcp/package.json
- admin/package.json
- build-candidate-facts.ts
- exports
- ai/src/schemas/index.ts
- capturePortfolioEvent
- requireAdmin
- data/package.json
- data/src/index.ts
- resume-pdf/index.ts
- generate-validated-content.ts
- dependencies
- resume-ats-document.tsx
- jobs/route.ts
- smoke-test-candidate-mcp.ts
- resume-layout.ts
- http-handler.ts
- experience-bullet-budget.ts
- observability/src/index.ts
- render-resume-pdf.tsx
- infra/package.json
- resume-modern-document.tsx
- logRouteError
- jobs-table.tsx
- app/page.tsx
- contact/route.ts
- dependencies
- runServerAction
- process-generation-job.ts
- auth-guard.ts
- pdf/route.tsx
- generator-client.tsx
- resume-generation-policy.ts
- ports/index.ts
- exports
- score-job.ts
- toError
- src/resume-data.ts
- web/src/app/layout.tsx
- chat-bubble.tsx
- deploy/package.json
- portfolio.ts
- dynamo-mcp-api-key-store.ts
- hero-tech-carousel.tsx
- @storybook/react
- job-actions.ts
- ui/package.json
- SidebarSettingsMenu
- vitest
- date-picker.tsx
- scripts
- select.tsx
- getContentRepository
- agent-mcp/package.json
- aws-cdk-lib
- compilerOptions
- [slug]/page.tsx
- compilerOptions
- compilerOptions
- compilerOptions
- naming.ts
- compilerOptions
- compilerOptions
- generate/route.ts
- scheduled.ts
- models.ts
- compilerOptions
- testimonials.tsx
- generate-recruiter-message.ts
- compilerOptions
- compilerOptions
- experience.tsx
- sqs-generation-job-queue.ts
- exports
- jobs/[id]/page.tsx
- media-library.tsx
- skills-editor.tsx
- ai/src/index.ts
- rate-limit-cost-cap.test.ts
- createMultiTableContentRepository
- s3-media-store.ts
- candidate-mcp-stack.ts
- nextjs-site.ts
- compilerOptions
- pdf-bullet-list.tsx
- compilerOptions
- tasks
- admin-stack.ts
- resume-form.tsx
- app/resume/page.tsx
- render-job-store.test.ts
- package.json
- sidebar.tsx
- web-stack.ts
- observability/package.json
- devDependencies
- src/media.ts
- Agent operating manual
- context.ts
- ai/package.json
- tables.ts
- theme-toggle.stories.tsx
- devDependencies
- lambda.ts
- devDependencies
- eslint-config/package.json
- tooltip.tsx
- resume-ai/rate-limit.ts
- devDependencies
- contact.tsx
- pdf-route.test.ts
- resume-pdf-preview.tsx
- command-palette.tsx
- navbar.tsx
- button.stories.tsx
- trim-ats-resume-for-page.ts
- web/src/instrumentation.ts
- prompts/resume.ts
- post-checkout
- post-commit
- job-preferences-form.tsx
- resume-generator/page.tsx
- generate-seed-from-export.py
- dependencies
- dependencies
- verify-ats-resume-pdf.ts
- scripts
- oauth-connector.integration.test.ts
- scripts
- peerDependenciesMeta
- peerDependencies
- admin/open-next.config.ts
- section-card.tsx
- posthog-js
- sitemap.ts
- shared-stack.ts
- next.mjs
- about.tsx
- why-hire-me.tsx
- scripts
- @playwright/test
- built-with.tsx
- portfolio-context
- main.ts
- admin/src/app/layout.tsx
- middleware.ts
- not-found.tsx
- fonts.ts
- devDependencies
- scripts
- admin/postcss.config.mjs
- web/postcss.config.mjs
- css.d.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 124 edges
2. `vitest` - 100 edges
3. `getContentRepository()` - 72 edges
4. `requireAdmin()` - 64 edges
5. `runServerAction()` - 45 edges
6. `useToast()` - 34 edges
7. `fetchSiteConfig` - 32 edges
8. `toError()` - 29 edges
9. `exports` - 26 edges
10. `capturePortfolioEvent()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `KeywordGroup()` --calls--> `cn()`  [EXTRACTED]
  apps/admin/src/app/(dashboard)/resume-generator/_components/ats-panel.tsx → packages/shared/src/utils.ts
- `MessageRow` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/chat/chat-bubble.tsx → packages/shared/src/utils.ts
- `assertNoInventedMetrics()` --calls--> `ResumePolicyError`  [EXTRACTED]
  apps/admin/src/lib/jobs/generate-recruiter-message.ts → packages/ai/src/policy/resume-generation-policy.ts
- `generateResume()` --calls--> `ResumePolicyError`  [EXTRACTED]
  apps/admin/src/lib/resume-ai/generate-validated-content.ts → packages/ai/src/policy/resume-generation-policy.ts
- `runJobIngest()` --calls--> `scoreJob()`  [EXTRACTED]
  apps/admin/src/lib/jobs/run-ingest.ts → packages/ai/src/matcher/score-job.ts

## Import Cycles
- None detected.

## Communities (170 total, 13 thin omitted)

### Community 0 - "job-feeds/index.ts"
Cohesion: 0.09
Nodes (42): IngestMailer, JobIngestSummary, runJobIngest(), RunJobIngestDeps, facts, toPosting(), CollectJobsOptions, CollectJobsResult (+34 more)

### Community 1 - "shared/src/schemas/index.ts"
Cohesion: 0.06
Nodes (55): ADR-0003, aboutRowSchema, aboutSchema, Highlight, highlightSchema, heroRowSchema, heroSchema, DEFAULT_JOB_PREFERENCES (+47 more)

### Community 2 - "chat/route.ts"
Cohesion: 0.14
Nodes (24): buildSystemPrompt, cachedAssistantResponse(), createStream(), jsonResponse(), maxDuration, POST(), sanitizeUserMessages(), GET() (+16 more)

### Community 3 - "export/route.ts"
Cohesion: 0.11
Nodes (22): bodySchema, maxDuration, numericClaims(), POST(), runtime, generation, layout, mocks (+14 more)

### Community 4 - "ats/route.ts"
Cohesion: 0.14
Nodes (19): Body, bodySchema, maxDuration, POST(), runGen(), runtime, cases, JailbreakCase (+11 more)

### Community 5 - "protocol-era.integration.test.ts"
Cohesion: 0.15
Nodes (25): base64url(), generateTestKeyPair(), signTestJwt(), testJwks(), createAgentTokenVerifier(), createCognitoVerifier(), config, { issuer } (+17 more)

### Community 6 - "cn"
Cohesion: 0.09
Nodes (33): LabeledField(), Props, StatDivider(), StatDividerProps, cn(), Badge(), BadgeProps, BadgeVariant (+25 more)

### Community 7 - "fetchSiteConfig"
Cohesion: 0.11
Nodes (28): AppleIcon(), contentType, size, dynamic, GET(), dynamic, GET(), contentType (+20 more)

### Community 8 - "icons/index.ts"
Cohesion: 0.07
Nodes (28): FeaturedProjectsSection(), FeaturedProjectsSectionProps, sectionVariants, filters, FilterValue, ProjectsGrid(), ProjectsGridProps, projectTypeIcon() (+20 more)

### Community 9 - "web/package.json"
Cohesion: 0.05
Nodes (38): ai, @ai-sdk/groq, @ai-sdk/react, clsx, eslint, framer-motion, lenis, lucide-react (+30 more)

### Community 10 - "multi-table-content-repository.ts"
Cohesion: 0.07
Nodes (69): Item, parseRow(), resumeGenerationRowSchema, SECTION, toAbout(), toExperience(), toHero(), toJobPreferences() (+61 more)

### Community 11 - "candidate-mcp/package.json"
Cohesion: 0.05
Nodes (38): dependencies, aws-jwt-verify, @aws-lambda-powertools/logger, @aws-sdk/client-cognito-identity-provider, @modelcontextprotocol/server, @portfolio/ai, @portfolio/data, @portfolio/observability (+30 more)

### Community 12 - "admin/package.json"
Cohesion: 0.05
Nodes (36): ai, @ai-sdk/anthropic, @ai-sdk/groq, @ai-sdk/react, eslint, lucide-react, next, @opennextjs/aws (+28 more)

### Community 13 - "build-candidate-facts.ts"
Cohesion: 0.08
Nodes (30): baseOptions, facts, mocks, validResume, createGenerationSnapshot(), facts(), loadCandidateFacts, loadCandidateFactsUncached() (+22 more)

### Community 14 - "exports"
Cohesion: 0.06
Nodes (35): dependencies, clsx, date-fns, tailwind-merge, zod, devDependencies, typescript, exports (+27 more)

### Community 15 - "ai/src/schemas/index.ts"
Cohesion: 0.07
Nodes (30): CoverLetterPreview(), Props, textareaCls, EnqueueBody, extractErrorMessage(), GenerationJobError, requestGeneration(), CombinedGeneration (+22 more)

### Community 16 - "capturePortfolioEvent"
Cohesion: 0.13
Nodes (20): FooterSocialLinks(), iconMap, SocialLink, PostHogThemeCapture(), ResumePdfDownloadLink(), downloadPdf(), SlugViewTracker(), SlugViewTrackerProps (+12 more)

### Community 17 - "requireAdmin"
Cohesion: 0.14
Nodes (32): LayoutCard(), Props, LayoutsList(), clone(), remove(), setDefault(), Props, applySummary() (+24 more)

### Community 18 - "data/package.json"
Cohesion: 0.06
Nodes (33): dependencies, @aws-sdk/client-dynamodb, @aws-sdk/client-s3, @aws-sdk/client-sqs, @aws-sdk/lib-dynamodb, @aws-sdk/s3-request-presigner, @portfolio/shared, zod (+25 more)

### Community 19 - "data/src/index.ts"
Cohesion: 0.14
Nodes (26): { check }, main(), createDynamoChatResponseCache(), createDynamoGenerationJobStore(), createDynamoMcpApiKeyStore(), createDynamoRenderJobStore(), createDynamoUsageReservation(), createMemoryChatResponseCache() (+18 more)

### Community 20 - "resume-pdf/index.ts"
Cohesion: 0.14
Nodes (19): CoverLetterDocument(), CoverLetterMeta, s, ResumePdfElement, fontCandidates(), moduleDirCandidate(), registerResumePdfFonts(), resolveFont() (+11 more)

### Community 21 - "generate-validated-content.ts"
Cohesion: 0.09
Nodes (39): ArtifactKind, AttemptBudget, AttemptContext, attemptReason(), AttemptResult, errorCause(), errorNameFromError(), errorRecord() (+31 more)

### Community 22 - "dependencies"
Cohesion: 0.06
Nodes (33): dependencies, ai, @ai-sdk/groq, @ai-sdk/react, clsx, cmdk, framer-motion, geist (+25 more)

### Community 23 - "resume-ats-document.tsx"
Cohesion: 0.13
Nodes (22): AtsExperienceEntry(), Props, AtsHeader(), ContactItem, displayPhone(), displayUrl(), findSocial(), Props (+14 more)

### Community 24 - "jobs/route.ts"
Cohesion: 0.08
Nodes (27): decodeCursor(), dynamic, GET(), runtime, mocks, queryAllByStatus(), JobNotifySummary, NotifyMailer (+19 more)

### Community 25 - "smoke-test-candidate-mcp.ts"
Cohesion: 0.06
Nodes (39): nextConfig, repoRoot, env, nextConfig, repoRoot, RFC-6750, getSecretJson(), getSecretString() (+31 more)

### Community 26 - "resume-layout.ts"
Cohesion: 0.07
Nodes (27): toResumeLayout(), ATS_RESUME_LAYOUT_ID, CLASSIC_LAYOUT_ID, atsResumeGuidelines(), atsResumeLayoutForm(), modernBlueGuidelines(), modernBlueLayoutForm(), normalizeResumeLayoutGuidelines() (+19 more)

### Community 27 - "http-handler.ts"
Cohesion: 0.11
Nodes (30): corsHeadersForRequest(), corsPreflightResponse(), MCP_ALLOWED_ORIGIN_HOSTNAMES, mcpAllowedOriginHostnames(), ADR-0006, withCors(), asStringArray(), DCR_REDIRECT_ALLOWLIST_PREFIXES (+22 more)

### Community 28 - "experience-bullet-budget.ts"
Cohesion: 0.16
Nodes (17): AllocatedBulletBudgets, allocateRecencyBulletBudgets(), BudgetableExperience, bulletBudgetForRole(), BulletBudgetInput, bulletFloorForRole(), DatedExperience, OLD_ROLE_MAX_BULLETS (+9 more)

### Community 29 - "observability/src/index.ts"
Cohesion: 0.22
Nodes (11): auditToolCall(), getLogger(), ToolCallAudit, ClientRateLimit, checkRateLimit(), { check }, authInfo, config (+3 more)

### Community 30 - "render-resume-pdf.tsx"
Cohesion: 0.15
Nodes (20): clampAtWord(), clampLongestModernBlueContent(), cloneModernBlueProjection(), FitReport, ModernBlueProjection, removeLeastRelevantBullet(), removeLeastRelevantRole(), removeLeastRelevantSkill() (+12 more)

### Community 31 - "infra/package.json"
Cohesion: 0.07
Nodes (29): dependencies, aws-cdk-lib, constructs, @portfolio/data, @portfolio/deploy, devDependencies, aws-cdk, esbuild (+21 more)

### Community 32 - "resume-modern-document.tsx"
Cohesion: 0.12
Nodes (26): ResumeDataSkillGroup, VariantGuidelines, displayPhone(), displayUrl(), ModernBlueHeader(), Props, createModernBlueStyles(), DENSITY (+18 more)

### Community 33 - "logRouteError"
Cohesion: 0.07
Nodes (30): GET(), Handlers, POST(), GET(), maxDuration, runtime, mocks, GET() (+22 more)

### Community 34 - "jobs-table.tsx"
Cohesion: 0.10
Nodes (24): dateLabel(), JOB_QUEUE_GRID, JobQueueRow(), JobQueueRowProps, JobRecommendedBanner(), JobRecommendedBannerProps, BANDS, JobStatusPills() (+16 more)

### Community 35 - "app/page.tsx"
Cohesion: 0.17
Nodes (19): AboutEditPage(), GET(), revalidate, firstSentence(), GET(), revalidate, manifest(), revalidate (+11 more)

### Community 36 - "contact/route.ts"
Cohesion: 0.13
Nodes (22): ensureResendApiKey(), ensureTurnstileSecret(), isContactConfigured(), jsonResponse(), POST(), verifyTurnstileToken(), ChatRateLimitDenied, ChatRateLimitOk (+14 more)

### Community 37 - "dependencies"
Cohesion: 0.07
Nodes (27): dependencies, ai, @ai-sdk/anthropic, @ai-sdk/groq, @ai-sdk/react, better-auth, @dnd-kit/core, @dnd-kit/sortable (+19 more)

### Community 38 - "runServerAction"
Cohesion: 0.05
Nodes (79): AboutForm(), onSubmit(), AboutFormProps, EMPTY, ExperienceEditForm, ExperienceEditPanel(), handleClose(), onSubmit() (+71 more)

### Community 39 - "process-generation-job.ts"
Cohesion: 0.13
Nodes (14): GenerationJobMessage, handler(), logger, parseMessageBody(), ValidatedGenerationError, GenerationJobPayload, generationJobPayloadSchema, mocks (+6 more)

### Community 40 - "auth-guard.ts"
Cohesion: 0.10
Nodes (25): McpOAuthPage(), ADR-0006, getAllowedAdminEmails(), isAdminEmailAllowed(), AdminAuth, mapSessionToIdentity(), SessionLike, SessionUserLike (+17 more)

### Community 41 - "pdf/route.tsx"
Cohesion: 0.18
Nodes (22): dynamic, GET(), maxDuration, runtime, slug(), handler(), logger, getResumeData (+14 more)

### Community 42 - "generator-client.tsx"
Cohesion: 0.05
Nodes (43): AppliedChangesList(), Props, AtsPanel(), KeywordGroup(), Props, scoreColor(), CopyButton(), Props (+35 more)

### Community 43 - "resume-generation-policy.ts"
Cohesion: 0.14
Nodes (21): validateCoverLetterFacts(), ATS_RESUME_ALLOWED_HYPHENS, ATS_RESUME_ALLOWED_TITLES, ATS_RESUME_SECTION_HEADERS, AtsResumeContentLintResult, isAllowedAtsTitle(), isAtsResumeLayout(), lintAtsResumeContent() (+13 more)

### Community 44 - "ports/index.ts"
Cohesion: 0.11
Nodes (21): registerResumeRenderers(), GenerationJobItem, AuthProvider, GenerationJob, GenerationJobError, GenerationJobInsert, GenerationJobStatus, GenerationJobStore (+13 more)

### Community 45 - "exports"
Cohesion: 0.08
Nodes (26): exports, ./context/build-candidate-facts, ./context/trim-job-description, ./errors, ./guardrails/ai-tone, ./guardrails/ats-refine, ./guardrails/fabrication-check, ./guardrails/output-sanitize (+18 more)

### Community 46 - "score-job.ts"
Cohesion: 0.12
Nodes (22): BOILERPLATE_PATTERNS, trimJobDescription(), CASES_DIR, EvalCase, facts, arrangementOk(), excludeOk(), jaccard() (+14 more)

### Community 47 - "toError"
Cohesion: 0.16
Nodes (15): GenerationJobMessage, handler(), logger, parseMessageBody(), handler(), logger, handler(), logger (+7 more)

### Community 48 - "src/resume-data.ts"
Cohesion: 0.14
Nodes (20): modernBlueReferenceResume, describeAppliedResumeChanges(), TailoredResumeDiffInput, base, formatExpLocation(), getResumeData(), GetResumeDataOptions, getValidatedHighlightedSkills() (+12 more)

### Community 49 - "web/src/app/layout.tsx"
Cohesion: 0.19
Nodes (16): asSocialLinks(), generateMetadata(), JsonLd(), RootLayout(), viewport, PostHogPageView(), PostHogAnalyticsProvider(), knowsAboutFromSkills() (+8 more)

### Community 50 - "chat-bubble.tsx"
Cohesion: 0.09
Nodes (24): AssistantMarkdown, AssistantMarkdownProps, mdComponents, remarkPlugins, ChatBubble(), askQuestion(), onSubmit(), floatingBubble (+16 more)

### Community 51 - "deploy/package.json"
Cohesion: 0.08
Nodes (24): dependencies, @modelcontextprotocol/client, devDependencies, tsx, @types/node, typescript, exports, ./media-remote-patterns (+16 more)

### Community 52 - "portfolio.ts"
Cohesion: 0.10
Nodes (18): ADR-0001, admin, app, auth, config, data, dns, edgeEnv (+10 more)

### Community 53 - "dynamo-mcp-api-key-store.ts"
Cohesion: 0.15
Nodes (20): buildApiKeyToken(), generateApiKeySecret(), hashApiKey(), MCP_API_KEY_ID_LEN, parseApiKeyToken(), ParsedApiKeyToken, runDummyHashCompare(), secretsEqual() (+12 more)

### Community 54 - "hero-tech-carousel.tsx"
Cohesion: 0.13
Nodes (18): HERO_TOP_TECHS, HeroTopTech, HeroTechCarousel(), HeroTechCarouselProps, Default, meta, Story, getHeroSimpleIcon() (+10 more)

### Community 55 - "@storybook/react"
Cohesion: 0.07
Nodes (24): Accent, AllVariants, Default, meta, Outline, Story, Success, Default (+16 more)

### Community 56 - "job-actions.ts"
Cohesion: 0.23
Nodes (17): JobDetailActions(), run(), JobDetailActionsProps, PIPELINE_ACTIONS, actionError(), ActionResult, draftRecruiterMessage(), releaseUsageReservation() (+9 more)

### Community 57 - "ui/package.json"
Cohesion: 0.09
Nodes (22): date-fns, framer-motion, lenis, lucide-react, next-themes, @portfolio/ai, @portfolio/shared, react (+14 more)

### Community 58 - "SidebarSettingsMenu"
Cohesion: 0.19
Nodes (4): GoogleSignInButton(), ERROR_MESSAGES, SidebarSettingsMenu(), authClient

### Community 59 - "vitest"
Cohesion: 0.09
Nodes (19): onRequestError(), ADMIN_ROOT, PUBLIC_AUTH_ROUTES, ADMIN_SRC, WORKER_GRAPH, repo, stdioRateLimit, ADR-0006 (+11 more)

### Community 60 - "date-picker.tsx"
Cohesion: 0.23
Nodes (10): endTimeForSort(), FORMATS, parseExperienceDateString(), sortExperienceByRecencyDesc(), Calendar(), CalendarProps, MonthYearPicker(), MonthYearPickerProps (+2 more)

### Community 61 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, build, build:open-next, build-storybook, clean, ddb:down, ddb:up, dev (+14 more)

### Community 62 - "select.tsx"
Cohesion: 0.18
Nodes (9): SelectProps, SelectVariant, Default, Disabled, meta, Muted, Story, WithError (+1 more)

### Community 63 - "getContentRepository"
Cohesion: 0.12
Nodes (14): ExperienceList(), ExperienceListPage(), HeroEditPage(), ProjectsListPage(), ProjectsList(), RecommendationsPage(), RecommendationsList(), Props (+6 more)

### Community 64 - "agent-mcp/package.json"
Cohesion: 0.10
Nodes (20): dependencies, @modelcontextprotocol/server, zod, devDependencies, tsx, @types/node, typescript, @modelcontextprotocol/server (+12 more)

### Community 65 - "aws-cdk-lib"
Cohesion: 0.24
Nodes (9): DEFAULTS, InfraConfig, resolveConfig(), CertStack, CertStackProps, baseConfig, synth(), OidcStackProps (+1 more)

### Community 66 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 67 - "[slug]/page.tsx"
Cohesion: 0.21
Nodes (9): ProjectDetailPage(), ProjectJsonLd(), revalidate, RelatedProjects(), breadcrumbListJsonLd(), creativeWorkJsonLd(), splitPlainTextParagraphs(), pickRelatedProjects() (+1 more)

### Community 68 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 69 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+11 more)

### Community 70 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+11 more)

### Community 71 - "naming.ts"
Cohesion: 0.20
Nodes (12): TABLE_SUFFIXES, CANDIDATE_MCP_READ_SUFFIXES, grantAdminDataAccess(), grantWebDataAccess(), secretNames(), ssmPaths(), tableArnPatterns(), ADR-0003 (+4 more)

### Community 72 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, declarationMap, esModuleInterop, lib, module, moduleResolution, noImplicitOverride (+11 more)

### Community 73 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+11 more)

### Community 74 - "generate/route.ts"
Cohesion: 0.16
Nodes (17): bodySchema, generationError(), maxDuration, POST(), releaseUsageReservation(), runtime, layout, mocks (+9 more)

### Community 75 - "scheduled.ts"
Cohesion: 0.22
Nodes (14): handler(), logger, asEmailJob(), runJobNotify(), mailTransport(), runScheduledIngest(), runScheduledNotify(), adminAppOrigin() (+6 more)

### Community 76 - "models.ts"
Cohesion: 0.15
Nodes (16): orderedModels(), MODEL_IDS, ModelId, qualityGenerateChainIds(), fallbackChainFor(), hasAnthropicKey(), modelFor(), ModelMode (+8 more)

### Community 77 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noImplicitOverride (+10 more)

### Community 78 - "testimonials.tsx"
Cohesion: 0.33
Nodes (7): Testimonials(), TestimonialsProps, formatRecommendationDate(), parseRecommendationDate(), sortRecommendationsByDateDesc(), RECOMMENDATIONS_SECTION_MAX, truncateRecommendationDescription()

### Community 79 - "generate-recruiter-message.ts"
Cohesion: 0.14
Nodes (22): assertNoInventedMetrics(), formatRecruiterMessage(), generateRecruiterMessage(), numericClaims(), buildCoverLetterSystemPrompt(), coverLetterAddressing(), CoverLetterPromptOptions, facts (+14 more)

### Community 80 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+10 more)

### Community 81 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+10 more)

### Community 82 - "experience.tsx"
Cohesion: 0.50
Nodes (3): ExperienceSection(), ExperienceSectionProps, sectionVariants

### Community 83 - "sqs-generation-job-queue.ts"
Cohesion: 0.18
Nodes (11): createSqsGenerationJobQueue(), SqsGenerationJobQueueConfig, makeQueue(), createSqsRenderJobQueue(), SqsRenderJobQueueConfig, makeQueue(), GenerationJobQueue, GenerationJobQueueMessage (+3 more)

### Community 84 - "exports"
Cohesion: 0.11
Nodes (18): exports, ./badge, ./button, ./calendar, ./card, ./date-picker, ./hero-tech-carousel, ./icons (+10 more)

### Community 85 - "jobs/[id]/page.tsx"
Cohesion: 0.23
Nodes (11): JobDetailHeader(), JobDetailHeaderProps, JobMatchPanel(), JobMatchPanelProps, dynamic, JobDetailPage(), BAND_STYLES, JobBandPill() (+3 more)

### Community 86 - "media-library.tsx"
Cohesion: 0.23
Nodes (10): formatUploadedAt(), MediaLibrary(), handleAltSave(), handleDelete(), MediaLibraryProps, ActionResult, deleteMediaAsset(), repo (+2 more)

### Community 87 - "skills-editor.tsx"
Cohesion: 0.12
Nodes (30): SkillsCategorySection(), SkillsCategorySectionProps, SkillsEditor(), applySkills(), handleAdd(), handleCategoryChange(), handleRemove(), handleReorder() (+22 more)

### Community 88 - "ai/src/index.ts"
Cohesion: 0.32
Nodes (10): AuthSecrets, getAuthSecrets(), googleOAuthSchema, loadBetterAuthSecret(), loadGoogleOAuth(), ensureAiApiKeys(), ensureAnthropicApiKey(), ensureGroqApiKey() (+2 more)

### Community 89 - "rate-limit-cost-cap.test.ts"
Cohesion: 0.11
Nodes (12): createContentCostCap(), WindowItem, createMemoryUsageReservation(), liveHeldUsd(), settledKey(), Hold, windowKey(), getCostCap() (+4 more)

### Community 90 - "createMultiTableContentRepository"
Cohesion: 0.32
Nodes (9): createMultiTableContentRepository(), getItem(), insertRow(), patchRow(), putWithRevision(), revisionOf(), upsertSingleton(), now() (+1 more)

### Community 91 - "s3-media-store.ts"
Cohesion: 0.26
Nodes (11): createNoopMediaStore(), createS3MediaStore(), S3MediaStoreConfig, makeStore(), ALLOWED_UPLOAD_TYPES, buildObjectKey(), isAllowedImageMime(), safeObjectFilename() (+3 more)

### Community 92 - "candidate-mcp-stack.ts"
Cohesion: 0.16
Nodes (12): restoreWwwAuthenticateFunctionCode(), RFC-9728, grantCandidateMcpDataAccess(), CandidateMcpStack, CandidateMcpStackProps, CLAUDE_CALLBACK_URLS, baseConfig, entry (+4 more)

### Community 93 - "nextjs-site.ts"
Cohesion: 0.17
Nodes (9): wwwRedirectFunctionCode(), lambdaDir, NextjsSite, NextjsSiteDomain, NextjsSiteProps, repoRoot, synth(), synthApp() (+1 more)

### Community 94 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit, noImplicitOverride (+8 more)

### Community 95 - "pdf-bullet-list.tsx"
Cohesion: 0.14
Nodes (13): ResumeDataExperience, ModernBlueExperienceEntry(), Props, parseRichText(), RichTextSegment, BulletStyle, Props, PdfMetaSections() (+5 more)

### Community 96 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 97 - "tasks"
Cohesion: 0.12
Nodes (16): dependsOn, env, outputs, cache, cache, persistent, globalDependencies, $schema (+8 more)

### Community 98 - "admin-stack.ts"
Cohesion: 0.27
Nodes (8): AdminStack, AdminStackProps, baseConfig, repoRoot, synth(), writeMinimalOpenNext(), ADR-0002, ADR-0003

### Community 99 - "resume-form.tsx"
Cohesion: 0.16
Nodes (16): CertificationDraft, clientId(), EducationDraft, LANGUAGE_LEVELS, LanguageDraft, parseCertifications(), parseEducation(), parseLanguages() (+8 more)

### Community 100 - "app/resume/page.tsx"
Cohesion: 0.11
Nodes (19): generateMetadata(), placeholderStats, generateMetadata(), ProjectsPage(), revalidate, generateMetadata(), generateStaticParams(), generateMetadata() (+11 more)

### Community 101 - "render-job-store.test.ts"
Cohesion: 0.21
Nodes (6): RenderJobItem, RenderJob, RenderJobInsert, RenderJobKind, RenderJobStatus, RenderJobStore

### Community 102 - "package.json"
Cohesion: 0.13
Nodes (14): engines, node, esbuild, name, packageManager, private, @eslint/eslintrc, jsdom (+6 more)

### Community 103 - "sidebar.tsx"
Cohesion: 0.28
Nodes (5): dynamic, navItems, Sidebar(), DashboardProviders(), ToastProvider()

### Community 104 - "web-stack.ts"
Cohesion: 0.19
Nodes (10): StaticSite, StaticSiteDomain, StaticSiteProps, aliasToCloudFront(), grantCanonicalResumePdfCacheWrite(), StorybookStack, StorybookStackProps, WebStack (+2 more)

### Community 105 - "observability/package.json"
Cohesion: 0.13
Nodes (14): dependencies, @aws-lambda-powertools/logger, devDependencies, typescript, exports, @aws-lambda-powertools/logger, typescript, name (+6 more)

### Community 106 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, framer-motion, lenis, lucide-react, react, react-dom, storybook, @storybook/react (+7 more)

### Community 107 - "src/media.ts"
Cohesion: 0.27
Nodes (7): POST(), runtime, MediaPage(), getMediaStore(), isMediaStorageConfigured(), createS3Client(), altTextFromFilename()

### Community 108 - "Agent operating manual"
Cohesion: 0.29
Nodes (6): Agent operating manual, Architecture maps, Do not, How to change things, Invariants (already enforced — do not weaken), What this repo is

### Community 109 - "context.ts"
Cohesion: 0.24
Nodes (9): ADR_IDS, AdrId, AI_CONTRACT_MODULES, AiContractModule, readAdr(), readAiContract(), ROOT, SCHEMA_FILES (+1 more)

### Community 110 - "ai/package.json"
Cohesion: 0.14
Nodes (13): ai, @ai-sdk/anthropic, @ai-sdk/groq, @portfolio/shared, @types/node, typescript, zod, name (+5 more)

### Community 111 - "tables.ts"
Cohesion: 0.22
Nodes (12): createDynamoRateLimiter(), ensureTables(), buildCreateTableInputs(), PAY_PER_REQUEST, resolveTablePrefix(), simpleTable(), TableKey, TableNames (+4 more)

### Community 112 - "theme-toggle.stories.tsx"
Cohesion: 0.38
Nodes (4): ThemeProvider(), Default, meta, Story

### Community 113 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, @opennextjs/aws, @portfolio/deploy, @portfolio/eslint-config, postcss, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 114 - "lambda.ts"
Cohesion: 0.36
Nodes (5): toWebRequest(), config, handler, lambdaHandler(), toApiGatewayResult()

### Community 115 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, esbuild, @eslint/eslintrc, jsdom, @playwright/test, prettier, prettier-plugin-tailwindcss, @testing-library/dom (+5 more)

### Community 116 - "eslint-config/package.json"
Cohesion: 0.15
Nodes (12): dependencies, eslint-config-next, exports, ./next, eslint, name, peerDependencies, eslint (+4 more)

### Community 117 - "tooltip.tsx"
Cohesion: 0.18
Nodes (9): getPosition(), Position, Basic, IconTrigger, meta, Story, Tooltip(), TooltipProps (+1 more)

### Community 118 - "resume-ai/rate-limit.ts"
Cohesion: 0.33
Nodes (5): DAILY, HOURLY, LimitDenied, LimitOk, ResumeAiRateLimitResult

### Community 119 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, @opennextjs/aws, @portfolio/deploy, @portfolio/eslint-config, postcss, tailwindcss, @tailwindcss/postcss (+4 more)

### Community 120 - "contact.tsx"
Cohesion: 0.21
Nodes (9): ContactSection(), handleSubmit(), ContactSectionProps, firstValidationMessage(), FormStatus, ContactTurnstile, ContactTurnstileHandle, ContactTurnstileProps (+1 more)

### Community 121 - "pdf-route.test.ts"
Cohesion: 0.22
Nodes (8): getObject, layout, resumeData, uploadObject, checkResumePdfRateLimit(), ResumePdfRateLimitDenied, ResumePdfRateLimitOk, ResumePdfRateLimitResult

### Community 122 - "resume-pdf-preview.tsx"
Cohesion: 0.16
Nodes (14): GeneratorClient(), download(), loadHistory(), recordChanges(), refreshHistory(), runGenerate(), extractErrorMessage(), RenderedPdf (+6 more)

### Community 123 - "command-palette.tsx"
Cohesion: 0.12
Nodes (14): CommandPalette(), ChatBubble, CommandPalette, DeferredWidgets(), DeferredWidgetsErrorBoundary, Props, State, importWithRetry() (+6 more)

### Community 124 - "navbar.tsx"
Cohesion: 0.33
Nodes (10): handleSectionNavClick(), MotionLink, Navbar(), NavbarProps, NavLink, normalizeSectionId(), scrollToSection(), toHomeSectionHref() (+2 more)

### Community 125 - "button.stories.tsx"
Cohesion: 0.18
Nodes (10): Accent, AllVariants, Default, Disabled, Ghost, Large, meta, Outline (+2 more)

### Community 126 - "trim-ats-resume-for-page.ts"
Cohesion: 0.46
Nodes (5): atsResumeReferenceData, cloneExperience(), totalBullets(), trimAtsResumeForPage(), trimOneOldestAtsBullet()

### Community 127 - "web/src/instrumentation.ts"
Cohesion: 0.36
Nodes (6): getCookieHeader(), onRequestError(), parseDistinctIdFromCookie(), getPostHogServer(), shutdownPostHogServer(), posthog-node

### Community 128 - "prompts/resume.ts"
Cohesion: 0.42
Nodes (8): atsOutputShape(), buildResumeSystemPrompt(), describeLayoutGuidelines(), interpolateTailoringTemplate(), isAtsResumeGuidelines(), outputShape(), ResumePromptOptions, describeBulletBudgetRules()

### Community 131 - "job-preferences-form.tsx"
Cohesion: 0.29
Nodes (8): FormValues, JobPreferencesForm(), onSubmit(), lines(), parseLines(), dynamic, JobPreferencesPage(), saveJobPreferences()

### Community 134 - "resume-generator/page.tsx"
Cohesion: 0.31
Nodes (6): Props, UsageStat(), DAILY_CAP, dynamic, ResumeGeneratorPage(), pickAdminResumeGeneratorDefaultLayout()

### Community 135 - "generate-seed-from-export.py"
Cohesion: 0.39
Nodes (8): main(), normalize_timestamp(), parse_json_field(), Regenerate seed/content.json from CSV exports in seed/export/., read_csv(), to_bool(), to_int(), to_nullable_str()

### Community 136 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, date-fns, @icons-pack/react-simple-icons, next-themes, @portfolio/ai, @portfolio/shared, @radix-ui/react-popover, react-day-picker (+1 more)

### Community 139 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, ai, @ai-sdk/anthropic, @ai-sdk/groq, @aws-sdk/client-secrets-manager, @portfolio/shared, server-only, zod

### Community 140 - "verify-ats-resume-pdf.ts"
Cohesion: 0.36
Nodes (6): AtsResumeVerifyError, pdfPageCount(), pdfToText(), verifyAtsResumePdf(), VerifyAtsResumePdfOptions, VerifyAtsResumePdfReport

### Community 141 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, start, typecheck

### Community 143 - "oauth-connector.integration.test.ts"
Cohesion: 0.17
Nodes (11): CognitoIdentityProviderClient, cognitoSend, config, CreateUserPoolClientCommand, initializeRequest(), MCP_ORIGIN, withHost(), ORIGIN_VERIFY_HEADER (+3 more)

### Community 144 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, start, typecheck

### Community 146 - "peerDependenciesMeta"
Cohesion: 0.29
Nodes (7): optional, optional, peerDependenciesMeta, framer-motion, lenis, @react-pdf/renderer, optional

### Community 147 - "peerDependencies"
Cohesion: 0.29
Nodes (7): peerDependencies, framer-motion, lenis, lucide-react, react, react-dom, @react-pdf/renderer

### Community 148 - "admin/open-next.config.ts"
Cohesion: 0.47
Nodes (3): config, config, OPEN_NEXT_LAMBDA_PACKAGES

### Community 149 - "section-card.tsx"
Cohesion: 0.40
Nodes (3): sections, SectionCard(), SectionCardProps

### Community 152 - "sitemap.ts"
Cohesion: 0.60
Nodes (3): sitemap(), fetchResume, latestUpdatedAt()

### Community 154 - "shared-stack.ts"
Cohesion: 0.40
Nodes (4): appErrorMetric(), SharedStack, SharedStackProps, ADR-0002

### Community 156 - "about.tsx"
Cohesion: 0.40
Nodes (4): AboutSection(), AboutSectionProps, sectionVariants, statusLabel

### Community 157 - "why-hire-me.tsx"
Cohesion: 0.40
Nodes (4): cardVariants, ICONS, WhyHireMeSection(), WhyHireMeSectionProps

### Community 158 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build-storybook, clean, storybook, typecheck

### Community 160 - "built-with.tsx"
Cohesion: 0.50
Nodes (3): BuiltWithSection(), BuiltWithSectionProps, sectionVariants

### Community 161 - "portfolio-context"
Cohesion: 0.50
Nodes (3): portfolio-context, pnpm, @portfolio/agent-mcp

### Community 168 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, @types/node, typescript

### Community 169 - "scripts"
Cohesion: 0.67
Nodes (3): scripts, clean, typecheck

## Knowledge Gaps
- **1378 isolated node(s):** `What this repo is`, `Invariants (already enforced — do not weaken)`, `How to change things`, `Do not`, `Architecture maps` (+1373 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1525 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `job-feeds/index.ts`, `prompts/resume.ts`, `chat/route.ts`, `export/route.ts`, `ats/route.ts`, `protocol-era.integration.test.ts`, `shared/src/schemas/index.ts`, `multi-table-content-repository.ts`, `build-candidate-facts.ts`, `oauth-connector.integration.test.ts`, `capturePortfolioEvent`, `ai/src/schemas/index.ts`, `data/src/index.ts`, `generate-validated-content.ts`, `resume-ats-document.tsx`, `jobs/route.ts`, `sitemap.ts`, `resume-layout.ts`, `http-handler.ts`, `smoke-test-candidate-mcp.ts`, `observability/src/index.ts`, `experience-bullet-budget.ts`, `render-resume-pdf.tsx`, `logRouteError`, `app/page.tsx`, `process-generation-job.ts`, `auth-guard.ts`, `pdf/route.tsx`, `generator-client.tsx`, `resume-generation-policy.ts`, `ports/index.ts`, `score-job.ts`, `src/resume-data.ts`, `web/src/app/layout.tsx`, `portfolio.ts`, `dynamo-mcp-api-key-store.ts`, `job-actions.ts`, `aws-cdk-lib`, `[slug]/page.tsx`, `generate/route.ts`, `models.ts`, `testimonials.tsx`, `generate-recruiter-message.ts`, `sqs-generation-job-queue.ts`, `skills-editor.tsx`, `rate-limit-cost-cap.test.ts`, `s3-media-store.ts`, `candidate-mcp-stack.ts`, `nextjs-site.ts`, `pdf-bullet-list.tsx`, `admin-stack.ts`, `render-job-store.test.ts`, `package.json`, `src/media.ts`, `context.ts`, `tables.ts`, `lambda.ts`, `pdf-route.test.ts`, `trim-ats-resume-for-page.ts`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `job-preferences-form.tsx`, `icons/index.ts`, `ai/src/schemas/index.ts`, `capturePortfolioEvent`, `requireAdmin`, `about.tsx`, `why-hire-me.tsx`, `built-with.tsx`, `jobs-table.tsx`, `runServerAction`, `auth-guard.ts`, `generator-client.tsx`, `chat-bubble.tsx`, `hero-tech-carousel.tsx`, `job-actions.ts`, `date-picker.tsx`, `select.tsx`, `jobs/[id]/page.tsx`, `skills-editor.tsx`, `resume-form.tsx`, `sidebar.tsx`, `tooltip.tsx`, `contact.tsx`, `resume-pdf-preview.tsx`, `command-palette.tsx`, `navbar.tsx`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `server-only` connect `models.ts` to `auth-guard.ts`, `ai/src/index.ts`, `contact/route.ts`, `ai/package.json`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `What this repo is`, `Invariants (already enforced — do not weaken)`, `How to change things` to the rest of the system?**
  _1378 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `job-feeds/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09413008989952407 - nodes in this community are weakly interconnected._
- **Should `shared/src/schemas/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05754475703324808 - nodes in this community are weakly interconnected._
- **Should `chat/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13911290322580644 - nodes in this community are weakly interconnected._