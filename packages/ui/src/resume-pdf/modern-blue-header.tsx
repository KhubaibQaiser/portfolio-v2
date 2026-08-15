import { Link, Text, View } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { ModernBlueStyles } from "./modern-blue-print-spec";

type Props = {
  data: ResumeData;
  styles: ModernBlueStyles;
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

export function ModernBlueHeader({ data, styles }: Props) {
  const linkedin = data.socialLinks.find(
    (link) => link.platform.trim().toLowerCase() === "linkedin",
  );
  const github = data.socialLinks.find(
    (link) => link.platform.trim().toLowerCase() === "github",
  );
  const items: Array<{ label: string; href?: string }> = [
    { label: data.location },
    ...(data.phone
      ? [
          {
            label: displayPhone(data.phone),
            href: `tel:${data.phone.replace(/^tel:/i, "")}`,
          },
        ]
      : []),
    { label: data.email, href: `mailto:${data.email}` },
    {
      label: displayUrl(data.website),
      href: /^https?:\/\//i.test(data.website) ? data.website : `https://${data.website}`,
    },
    ...(linkedin ? [{ label: displayUrl(linkedin.url), href: linkedin.url }] : []),
    ...(github ? [{ label: displayUrl(github.url), href: github.url }] : []),
  ].filter((item) => item.label.trim().length > 0);

  return (
    <View style={styles.header}>
      <Text style={styles.name}>{data.name}</Text>
      <Text style={styles.title}>{data.title}</Text>
      <View style={styles.contact}>
        {items.map((item, index) => (
          <Text key={`${item.label}-${index}`}>
            {index > 0 ? (
              <Text style={styles.contactSeparator}>{"\u00A0|\u00A0"}</Text>
            ) : null}
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
    </View>
  );
}
