import { Document, Page, Text, View, StyleSheet, Link, Font } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import { COLORS, baseStyles } from "./styles";

Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  ...baseStyles,

  expEntry: { marginBottom: 6 },
  expHeaderBlock: { marginBottom: 2 },
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  expRole: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  expPeriod: { fontSize: 9, color: COLORS.secondary, textAlign: "right" },
  expSubHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 1,
  },
  expCompany: {
    fontSize: 10,
    fontFamily: "Helvetica-Oblique",
    color: COLORS.body,
  },
  expContractType: {
    fontFamily: "Helvetica-Oblique",
    color: COLORS.secondary,
  },
  expLocation: { fontSize: 9, color: COLORS.secondary },
  bulletList: { marginTop: 3, paddingLeft: 10 },
  bulletRow: { flexDirection: "row", marginBottom: 2 },
  bulletDot: { width: 10, fontSize: 10, color: COLORS.accent },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    color: COLORS.body,
    lineHeight: 1.35,
  },
  skillRow: { flexDirection: "row", marginBottom: 3 },
  skillCategory: {
    width: 88,
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
  },
  skillItems: { flex: 1, fontSize: 9.5, color: COLORS.body },
  eduLine: { fontSize: 9.5, color: COLORS.body, lineHeight: 1.35 },
  certRow: { flexDirection: "row", marginBottom: 2 },
  certBullet: { width: 10, fontSize: 10, color: COLORS.accent },
  certText: { flex: 1, fontSize: 9.5, color: COLORS.body },
  certIssuer: { color: COLORS.secondary },
});

function socialLinkLabel(link: { platform: string; label: string }): string {
  const trimmed = link.label.trim();
  if (trimmed) return trimmed;
  return link.platform;
}

function Sep() {
  return <Text style={s.headerSep}>&nbsp;|&nbsp;</Text>;
}

function formatEducationLine(edu: ResumeData["education"][number]): string {
  return `${edu.degree}, ${edu.institution} · ${edu.year}`;
}

export function ResumeDocument({ data }: { data: ResumeData }) {
  const show = (key: string) => data.visibleSections.includes(key);

  return (
    <Document
      title={`${data.name} - ${data.title} Resume`}
      author={data.name}
      subject={`Resume of ${data.name}, ${data.title}`}
      keywords={data.keywords}
    >
      <Page size="LETTER" style={s.page}>
        <View style={s.headerBand}>
          <Text style={s.headerName}>{data.name}</Text>
          <Text style={s.headerTitle}>{data.title}</Text>

          <View style={s.headerContact}>
            <Text>{data.location}</Text>
            {data.phone && (
              <>
                <Sep />
                <Link src={data.phone} style={s.headerLink}>
                  {data.phone.replace("tel:", "")}
                </Link>
              </>
            )}
            <Sep />
            <Link src={`mailto:${data.email}`} style={s.headerLink}>
              {data.email}
            </Link>
            <Sep />
            <Link src={`https://${data.website}`} style={s.headerLink}>
              Portfolio
            </Link>
            {data.socialLinks
              .filter((l) => ["linkedin", "github"].includes(l.platform))
              .flatMap((link) => [
                <Sep key={`${link.platform}-sep`} />,
                <Link key={link.platform} src={link.url} style={s.headerLink}>
                  {socialLinkLabel(link)}
                </Link>,
              ])}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Professional Summary</Text>
          <Text style={s.summary}>{data.summary}</Text>
        </View>

        {show("experience") && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Work Experience</Text>
            {data.experience.map((exp) => (
              <View key={`${exp.company}-${exp.period}`} style={s.expEntry}>
                <View style={s.expHeaderBlock} wrap={false}>
                  <View style={s.expHeader}>
                    <Text style={s.expRole}>{exp.role}</Text>
                    <Text style={s.expPeriod}>{exp.period}</Text>
                  </View>
                  <View style={s.expSubHeader}>
                    <Text style={s.expCompany}>
                      {exp.company}
                      {exp.contractType ? (
                        <Text style={s.expContractType}>{` · ${exp.contractType}`}</Text>
                      ) : null}
                    </Text>
                    <Text style={s.expLocation}>{exp.location}</Text>
                  </View>
                </View>
                <View style={s.bulletList}>
                  {exp.bullets.map((bullet, i) => (
                    <View key={i} style={s.bulletRow}>
                      <Text style={s.bulletDot}>-</Text>
                      <Text style={s.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {show("education") && data.education.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Education</Text>
            {data.education.map((edu) => (
              <Text key={edu.institution} style={s.eduLine}>
                {formatEducationLine(edu)}
              </Text>
            ))}
          </View>
        )}

        {show("certifications") && data.certifications.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Certifications</Text>
            {data.certifications.map((cert) => (
              <View key={cert.name} style={s.certRow}>
                <Text style={s.certBullet}>-</Text>
                <Text style={s.certText}>
                  {cert.name}
                  {cert.issuer ? (
                    <Text style={s.certIssuer}>{` (${cert.issuer})`}</Text>
                  ) : null}
                </Text>
              </View>
            ))}
          </View>
        )}

        {show("skills") && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Technical Skills</Text>
            {data.skills.map((group) => (
              <View key={group.category} style={s.skillRow}>
                <Text style={s.skillCategory}>{group.category}</Text>
                <Text style={s.skillItems}>{group.items.join(", ")}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
