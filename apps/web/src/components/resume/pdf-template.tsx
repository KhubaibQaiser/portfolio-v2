import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Font,
} from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/resume-data";

Font.registerHyphenationCallback((word) => [word]);

const COLORS = {
  black: "#111827",
  dark: "#1f2937",
  muted: "#4b5563",
  light: "#9ca3af",
  accent: "#2563eb",
  border: "#d1d5db",
  bg: "#ffffff",
} as const;

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: COLORS.dark,
    backgroundColor: COLORS.bg,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    lineHeight: 1.4,
  },

  // Header
  headerName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 11,
    color: COLORS.accent,
    marginTop: 2,
  },
  headerMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
    fontSize: 9,
    color: COLORS.muted,
  },
  headerLink: {
    color: COLORS.accent,
    textDecoration: "none",
  },
  headerSep: {
    color: COLORS.light,
  },

  // Sections
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingBottom: 3,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.border,
    borderBottomStyle: "solid",
    marginBottom: 6,
  },

  // Summary
  summary: {
    fontSize: 9.5,
    color: COLORS.muted,
    lineHeight: 1.5,
  },

  // Experience
  expEntry: {
    marginBottom: 10,
  },
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  expRole: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },
  expPeriod: {
    fontSize: 8.5,
    color: COLORS.muted,
    textAlign: "right",
  },
  expCompany: {
    fontSize: 9.5,
    color: COLORS.accent,
    marginTop: 1,
  },
  expLocation: {
    fontSize: 8.5,
    color: COLORS.light,
    marginTop: 1,
  },
  bulletList: {
    marginTop: 4,
    paddingLeft: 8,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bulletDot: {
    width: 8,
    fontSize: 9,
    color: COLORS.accent,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: COLORS.muted,
    lineHeight: 1.45,
  },
  techLine: {
    fontSize: 8,
    color: COLORS.light,
    marginTop: 3,
  },
  techBold: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.muted,
  },

  // Skills grid
  skillRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  skillCategory: {
    width: 110,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },
  skillItems: {
    flex: 1,
    fontSize: 9,
    color: COLORS.muted,
  },

  // Education
  eduEntry: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  eduDegree: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },
  eduInstitution: {
    fontSize: 9,
    color: COLORS.accent,
  },
  eduYear: {
    fontSize: 9,
    color: COLORS.muted,
  },

  // Certifications
  certItem: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 2,
  },
});

export function ResumeDocument({ data }: { data: ResumeData }) {
  return (
    <Document
      title={`${data.name} — ${data.title} Resume`}
      author={data.name}
      subject={`Resume of ${data.name}, ${data.title}`}
      keywords="Senior Software Engineer, React, Next.js, TypeScript, AWS, Full Stack"
    >
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View>
          <Text style={s.headerName}>{data.name}</Text>
          <Text style={s.headerTitle}>{data.title}</Text>
          <View style={s.headerMeta}>
            <Text>{data.location}</Text>
            <Text style={s.headerSep}>|</Text>
            <Link src={`mailto:${data.email}`} style={s.headerLink}>
              {data.email}
            </Link>
            <Text style={s.headerSep}>|</Text>
            <Link src={`https://${data.website}`} style={s.headerLink}>
              {data.website}
            </Link>
            <Text style={s.headerSep}>|</Text>
            <Link src={`https://${data.linkedin}`} style={s.headerLink}>
              {data.linkedin}
            </Link>
            <Text style={s.headerSep}>|</Text>
            <Link src={`https://${data.github}`} style={s.headerLink}>
              {data.github}
            </Link>
          </View>
        </View>

        {/* Summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Professional Summary</Text>
          <Text style={s.summary}>{data.summary}</Text>
        </View>

        {/* Skills */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Technical Skills</Text>
          {data.skills.map((group) => (
            <View key={group.category} style={s.skillRow}>
              <Text style={s.skillCategory}>{group.category}:</Text>
              <Text style={s.skillItems}>{group.items.join(", ")}</Text>
            </View>
          ))}
        </View>

        {/* Experience */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Professional Experience</Text>
          {data.experience.map((exp) => (
            <View key={`${exp.company}-${exp.period}`} style={s.expEntry}>
              <View style={s.expHeader}>
                <Text style={s.expRole}>{exp.role}</Text>
                <Text style={s.expPeriod}>{exp.period}</Text>
              </View>
              <Text style={s.expCompany}>{exp.company}</Text>
              <Text style={s.expLocation}>{exp.location}</Text>
              <View style={s.bulletList}>
                {exp.bullets.map((bullet, i) => (
                  <View key={i} style={s.bulletRow}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.techLine}>
                <Text style={s.techBold}>Tech: </Text>
                {exp.tech}
              </Text>
            </View>
          ))}
        </View>

        {/* Education */}
        <View style={s.section}>
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

        {/* Certifications */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Certifications</Text>
          {data.certifications.map((cert) => (
            <Text key={cert} style={s.certItem}>
              • {cert}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}
