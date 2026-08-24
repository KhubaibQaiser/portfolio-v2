import { Link, Text, View } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { AtsResumeStyles } from "./ats-print-spec";

type Props = {
  data: ResumeData;
  styles: AtsResumeStyles;
};

type ContactItem = {
  label: string;
  href?: string;
};

function displayUrl(value: string): string {
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function displayPhone(value: string): string {
  const raw = value.replace(/^tel:/i, "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("92")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return raw;
}

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

function findSocial(data: ResumeData, platform: string) {
  return data.socialLinks.find((link) => link.platform.trim().toLowerCase() === platform);
}

export function AtsHeader({ data, styles }: Props) {
  const github = findSocial(data, "github");
  const linkedin = findSocial(data, "linkedin");
  const items: ContactItem[] = [
    { label: data.location },
    ...(data.phone?.trim()
      ? [
          {
            label: displayPhone(data.phone),
            href: `tel:${data.phone.replace(/^tel:/i, "").trim()}`,
          },
        ]
      : []),
    ...(data.email.trim() ? [{ label: data.email, href: `mailto:${data.email}` }] : []),
    ...(data.website.trim()
      ? [
          {
            label: displayUrl(data.website),
            href: websiteHref(data.website),
          },
        ]
      : []),
    ...(github ? [{ label: displayUrl(github.url), href: github.url }] : []),
    ...(linkedin ? [{ label: displayUrl(linkedin.url), href: linkedin.url }] : []),
  ].filter((item) => item.label.trim().length > 0);

  return (
    <View style={styles.header} wrap={false}>
      <Text style={styles.name}>{data.name}</Text>
      {data.title.trim() ? <Text style={styles.title}>{data.title}</Text> : null}
      {items.length > 0 ? (
        <View style={styles.contact}>
          {items.map((item, index) => (
            <Text key={`${item.label}-${index}`} style={styles.contactText}>
              {index > 0 ? <Text style={styles.contactSeparator}>{" | "}</Text> : null}
              {item.href ? (
                <Link src={item.href} style={styles.contactLink}>
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.headerRule} />
    </View>
  );
}
