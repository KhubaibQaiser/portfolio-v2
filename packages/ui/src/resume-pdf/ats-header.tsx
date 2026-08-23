import { Link, Text, View } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { AtsResumeStyles } from "./ats-print-spec";

type Props = {
  data: ResumeData;
  styles: AtsResumeStyles;
};

function displayUrl(value: string): string {
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function AtsHeader({ data, styles }: Props) {
  const github = data.socialLinks.find((link) => link.platform === "github");
  const linkedin = data.socialLinks.find((link) => link.platform === "linkedin");
  const items: Array<{ label: string; href?: string }> = [
    { label: data.location },
    ...(data.phone?.trim() ? [{ label: data.phone.trim() }] : []),
    { label: data.email, href: `mailto:${data.email}` },
    {
      label: displayUrl(data.website),
      href: /^https?:\/\//i.test(data.website) ? data.website : `https://${data.website}`,
    },
    ...(github
      ? [
          {
            label: displayUrl(github.label || github.url),
            href: github.url,
          },
        ]
      : []),
    ...(linkedin
      ? [
          {
            label: displayUrl(linkedin.label || linkedin.url),
            href: linkedin.url,
          },
        ]
      : []),
  ].filter((item) => item.label.trim().length > 0);

  return (
    <View style={styles.header}>
      <Text style={styles.name}>{data.name}</Text>
      <Text style={styles.title}>{data.title}</Text>
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
      <View style={styles.headerRule} />
    </View>
  );
}
