import { Document, Page, Text, View, StyleSheet, Link, Font } from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/resume-data";

Font.registerHyphenationCallback((word) => [word]);

const COLORS = {
  primary: "#111827",
  body: "#1f2937",
  secondary: "#374151",
  subtle: "#6b7280",
  accent: "#1d4ed8",
  rule: "#d1d5db",
  bg: "#ffffff",
} as const;

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.body,
    backgroundColor: COLORS.bg,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    lineHeight: 1.4,
  },

  // ── Header ──────────────────────────────────────────────────────────
  headerName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    letterSpacing: 0.3,
    lineHeight: 1.2,
  },
  headerTitle: {
    fontSize: 11,
    color: COLORS.secondary,
    lineHeight: 1.3,
    marginTop: 3,
  },
  headerContact: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 6,
    fontSize: 9.5,
    color: COLORS.body,
  },
  headerLink: {
    color: COLORS.accent,
    textDecoration: "none",
    fontSize: 9.5,
  },
  headerSep: {
    color: COLORS.subtle,
    fontSize: 9.5,
  },
  headerRule: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    borderBottomStyle: "solid",
    marginTop: 10,
  },

  // ── Section ─────────────────────────────────────────────────────────
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    letterSpacing: 0.3,
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.rule,
    borderBottomStyle: "solid",
    marginBottom: 6,
  },

  // ── Summary ─────────────────────────────────────────────────────────
  summary: {
    fontSize: 10,
    color: COLORS.body,
    lineHeight: 1.5,
  },

  // ── Experience ──────────────────────────────────────────────────────
  expEntry: {
    marginBottom: 10,
  },
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
  expPeriod: {
    fontSize: 9,
    color: COLORS.secondary,
    textAlign: "right",
  },
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
  expLocation: {
    fontSize: 9,
    color: COLORS.secondary,
  },
  bulletList: {
    marginTop: 3,
    paddingLeft: 10,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
    color: COLORS.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    color: COLORS.body,
    lineHeight: 1.45,
  },
  techLine: {
    fontSize: 9,
    color: COLORS.secondary,
    marginTop: 2,
    paddingLeft: 10,
    lineHeight: 1.35,
  },
  techLabel: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.body,
  },

  // ── Skills ──────────────────────────────────────────────────────────
  skillRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  skillCategory: {
    width: 100,
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  skillItems: {
    flex: 1,
    fontSize: 9.5,
    color: COLORS.body,
  },

  // ── Education ───────────────────────────────────────────────────────
  eduEntry: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  eduDegree: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  eduInstitution: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Oblique",
    color: COLORS.body,
  },
  eduYear: {
    fontSize: 9.5,
    color: COLORS.secondary,
  },

  // ── Certifications ─────────────────────────────────────────────────
  certRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  certBullet: {
    width: 10,
    fontSize: 10,
    color: COLORS.primary,
  },
  certText: {
    flex: 1,
    fontSize: 9.5,
    color: COLORS.body,
  },
  certIssuer: {
    color: COLORS.secondary,
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────

function socialLinkLabel(link: { platform: string; label: string }): string {
  const trimmed = link.label.trim();
  if (trimmed) return trimmed;
  return link.platform;
}

function Sep() {
  return <Text style={s.headerSep}>&nbsp;|&nbsp;</Text>;
}

// ── Document ────────────────────────────────────────────────────────────

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
        {/* ── Header ─────────────────────────────────── */}
        <View>
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

          <View style={s.headerRule} />
        </View>

        {/* ── Professional Summary ────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Professional Summary</Text>
          <Text style={s.summary}>{data.summary}</Text>
        </View>

        {/* ── Work Experience ─────────────────────────── */}
        {show("experience") && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Work Experience</Text>
            {data.experience.map((exp) => (
              <View key={`${exp.company}-${exp.period}`} style={s.expEntry} wrap={false}>
                <View style={s.expHeader}>
                  <Text style={s.expRole}>{exp.role}</Text>
                  <Text style={s.expPeriod}>{exp.period}</Text>
                </View>
                <View style={s.expSubHeader}>
                  <Text style={s.expCompany}>{exp.company}</Text>
                  <Text style={s.expLocation}>{exp.location}</Text>
                </View>
                <View style={s.bulletList}>
                  {exp.bullets.map((bullet, i) => (
                    <View key={i} style={s.bulletRow}>
                      <Text style={s.bulletDot}>-</Text>
                      <Text style={s.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
                {exp.tech && (
                  <Text style={s.techLine}>
                    <Text style={s.techLabel}>Technologies: </Text>
                    {exp.tech}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Technical Skills ────────────────────────── */}
        {show("skills") && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Technical Skills</Text>
            {data.skills.map((group) => (
              <View key={group.category} style={s.skillRow}>
                <Text style={s.skillCategory}>{group.category}</Text>
                <Text style={s.skillItems}>{group.items.join(", ")}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Education ───────────────────────────────── */}
        {show("education") && data.education.length > 0 && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Education</Text>
            {data.education.map((edu) => (
              <View key={edu.institution} style={s.eduEntry}>
                <View>
                  <Text style={s.eduDegree}>{edu.degree}</Text>
                  <Text style={s.eduInstitution}>{edu.institution}</Text>
                </View>
                <Text style={s.eduYear}>{edu.year}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Certifications ──────────────────────────── */}
        {show("certifications") && data.certifications.length > 0 && (
          <View style={s.section} wrap={false}>
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
      </Page>
    </Document>
  );
}
