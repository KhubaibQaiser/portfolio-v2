import { z } from "zod";

/** http(s), mailto, or tel — resume PDF uses tel:+… for phone (no DOM `URL` — shared pkg is ES-only) */
const socialUrlSchema = z.string().min(1).refine(
  (val) => {
    const s = val.trim();
    if (/^tel:/i.test(s)) return /^tel:\S+/i.test(s);
    if (/^mailto:/i.test(s)) return /^mailto:\S+@\S+\.\S+/i.test(s);
    return /^https?:\/\/\S+/i.test(s);
  },
  { message: "Must be a valid https URL, mailto:, or tel: link" },
);

export const socialLinkSchema = z.object({
  platform: z.string().min(1),
  url: socialUrlSchema,
  label: z.string().min(1),
});

export type SocialLink = z.infer<typeof socialLinkSchema>;

export const navLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export type NavLink = z.infer<typeof navLinkSchema>;

export const siteConfigSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  location: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  social_links: z.array(socialLinkSchema),
  nav_links: z.array(navLinkSchema),
});

export type SiteConfigFormData = z.infer<typeof siteConfigSchema>;

export const siteConfigRowSchema = siteConfigSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type SiteConfig = z.infer<typeof siteConfigRowSchema>;
