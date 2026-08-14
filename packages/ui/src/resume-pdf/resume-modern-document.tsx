import { Document, Page, Text, View, StyleSheet, Link, Font } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { VariantGuidelines } from "@portfolio/shared/schemas";
import { classicGuidelines } from "@portfolio/shared/schemas";
import { PdfBulletList } from "./pdf-bullet-list";
import { PdfMetaSections } from "./pdf-meta-sections";
import { RichPdfText } from "./rich-pdf-text";
import { headingFontFamily, registerResumePdfFonts } from "./register-fonts";
import { showResumePdfSection } from "./section-visibility";

Font.registerHyphenationCallback((word) => [word]);

const FALLBACK = classicGuidelines();

function palette(guidelines: VariantGuidelines | undefined) {
  const p = guidelines?.formatting.colorPalette ?? FALLBACK.formatting.colorPalette;
  return {
    primary: p.primary ?? "#2C6EF2",
    ink: p.ink ?? p.primary ?? "#1A1A1A",
    gray: p.gray ?? "#555550",
    pale: p.pale ?? "#EEF3FE",
    rule: p.rule ?? "#E5E0D8",
  };
}

type Props = {
  data: ResumeData;
  guidelines?: VariantGuidelines;
};

export function ResumeModernDocument({ data, guidelines }: Props) {
  registerResumePdfFonts();
  const colors = palette(guidelines);
  const heading = headingFontFamily();
  const pageSize = guidelines?.formatting.layout.pageSize ?? "A4";
  const show = (key: string) => data.visibleSections.includes(key);
  const showExperience = show("experience");
  const showProjects = show("projects") && data.projects.length > 0;
  const showEducation = show("education") && data.education.length > 0;
  const showCertifications = show("certifications") && data.certifications.length > 0;
  const showSkills = show("skills") && data.skills.length > 0;
  const showLanguages = showResumePdfSection(data, guidelines, "languages", "languages");
  const showRemote = showResumePdfSection(
    data,
    guidelines,
    "remote",
    "remoteWorkExperience",
  );
  const showReferences = showResumePdfSection(
    data,
    guidelines,
    "references",
    "references",
  );

  const s = StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 8,
      color: colors.ink,
      backgroundColor: "#ffffff",
      paddingTop: 34,
      paddingBottom: 28,
      paddingHorizontal: 37,
      lineHeight: 1.5,
    },
    name: {
      fontFamily: heading,
      fontSize: 28,
      color: colors.ink,
      letterSpacing: -0.3,
      lineHeight: 1.1,
    },
    title: {
      fontFamily: "Helvetica-Bold",
      fontSize: 7.5,
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 4,
    },
    contact: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 8,
      fontSize: 9,
      color: colors.gray,
    },
    link: { color: colors.primary, textDecoration: "none", fontSize: 9 },
    sep: { color: colors.gray, fontSize: 9 },
    columns: { flexDirection: "row", marginTop: 16, gap: 16 },
    left: { flex: 1 },
    right: { width: 130 },
    section: { marginBottom: 12 },
    sectionTitle: {
      fontFamily: "Helvetica-Bold",
      fontSize: 6.5,
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      marginBottom: 6,
    },
    summary: { fontSize: 8, color: colors.ink, lineHeight: 1.5 },
    expEntry: { marginBottom: 9 },
    expRole: {
      fontFamily: "Helvetica-Bold",
      fontSize: 8.5,
      color: colors.ink,
    },
    expMeta: { fontSize: 7.5, color: colors.gray, marginTop: 1 },
    bulletList: { marginTop: 3, paddingLeft: 11 },
    bulletRow: { flexDirection: "row", marginBottom: 2 },
    bulletDot: { width: 10, fontSize: 8, color: colors.primary },
    bulletText: { flex: 1, fontSize: 8, color: colors.ink, lineHeight: 1.44 },
    skillBlock: {
      backgroundColor: colors.pale,
      padding: 8,
      marginBottom: 6,
    },
    skillCat: {
      fontFamily: "Helvetica-Bold",
      fontSize: 7.5,
      color: colors.primary,
      marginBottom: 3,
    },
    skillItems: { fontSize: 7.5, color: colors.ink, lineHeight: 1.4 },
    eduLine: { fontSize: 8, color: colors.ink, lineHeight: 1.4, marginBottom: 3 },
    metaBody: { fontSize: 7.5, color: colors.ink, lineHeight: 1.4 },
    rule: { borderBottomWidth: 1, borderBottomColor: colors.rule, marginBottom: 10 },
  });

  const bullets = {
    list: s.bulletList,
    row: s.bulletRow,
    dot: s.bulletDot,
    text: s.bulletText,
  };

  return (
    <Document
      title={`${data.name} - ${data.title} Resume`}
      author={data.name}
      subject={`Resume of ${data.name}, ${data.title}`}
      keywords={data.keywords}
    >
      <Page size={pageSize} style={s.page}>
        <View>
          <Text style={s.name}>{data.name}</Text>
          <Text style={s.title}>{data.title}</Text>
          <View style={s.contact}>
            <Text>{data.location}</Text>
            {data.phone ? (
              <>
                <Text style={s.sep}>&nbsp;|&nbsp;</Text>
                <Link src={data.phone} style={s.link}>
                  {data.phone.replace("tel:", "")}
                </Link>
              </>
            ) : null}
            <Text style={s.sep}>&nbsp;|&nbsp;</Text>
            <Link src={`mailto:${data.email}`} style={s.link}>
              {data.email}
            </Link>
            <Text style={s.sep}>&nbsp;|&nbsp;</Text>
            <Link src={`https://${data.website}`} style={s.link}>
              Portfolio
            </Link>
            {data.socialLinks
              .filter((l) => ["linkedin", "github"].includes(l.platform))
              .flatMap((link) => [
                <Text key={`${link.platform}-sep`} style={s.sep}>
                  &nbsp;|&nbsp;
                </Text>,
                <Link key={link.platform} src={link.url} style={s.link}>
                  {link.label.trim() || link.platform}
                </Link>,
              ])}
          </View>
        </View>
        <View style={s.rule} />

        <View style={s.columns}>
          <View style={s.left}>
            {guidelines?.sections.summary !== false ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Summary</Text>
                <RichPdfText value={data.summary} style={s.summary} />
              </View>
            ) : null}

            {showExperience
              ? data.experience.map((exp) => (
                  <View
                    key={`${exp.company}-${exp.period}`}
                    style={s.expEntry}
                    wrap={false}
                  >
                    {exp === data.experience[0] ? (
                      <Text style={s.sectionTitle}>Experience</Text>
                    ) : null}
                    <Text style={s.expRole}>{exp.role}</Text>
                    <Text style={s.expMeta}>
                      {exp.company} · {exp.period} · {exp.location}
                    </Text>
                    <PdfBulletList bullets={exp.bullets} styles={bullets} />
                  </View>
                ))
              : null}

            {showProjects
              ? data.projects.map((project, index) => (
                  <View key={project.name} style={s.expEntry} wrap={false}>
                    {index === 0 ? <Text style={s.sectionTitle}>Projects</Text> : null}
                    <Text style={s.expRole}>
                      {project.name}
                      {project.status ? ` (${project.status})` : ""}
                    </Text>
                    <PdfBulletList bullets={project.bullets} styles={bullets} />
                  </View>
                ))
              : null}

            {showEducation ? (
              <View style={s.section} wrap={false}>
                <Text style={s.sectionTitle}>Education</Text>
                {data.education.map((edu) => (
                  <Text key={edu.institution} style={s.eduLine}>
                    {edu.degree}, {edu.institution} · {edu.year}
                  </Text>
                ))}
              </View>
            ) : null}

            {showCertifications ? (
              <View style={s.section} wrap={false}>
                <Text style={s.sectionTitle}>Certifications</Text>
                {data.certifications.map((cert) => (
                  <Text key={cert.name} style={s.eduLine}>
                    {cert.name}
                    {cert.issuer ? ` (${cert.issuer})` : ""}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>

          <View style={s.right}>
            {showSkills
              ? data.skills.map((group, index) => (
                  <View
                    key={group.category}
                    style={index === 0 ? s.skillBlock : s.section}
                    wrap={false}
                  >
                    {index === 0 ? <Text style={s.sectionTitle}>Skills</Text> : null}
                    <Text style={s.skillCat}>{group.category}</Text>
                    <Text style={s.skillItems}>{group.items.join(", ")}</Text>
                  </View>
                ))
              : null}

            <PdfMetaSections
              languages={data.languages}
              remoteWorkLine={data.remoteWorkLine}
              referencesLine={data.referencesLine}
              showLanguages={showLanguages}
              showRemote={showRemote}
              showReferences={showReferences}
              titleStyle={s.sectionTitle}
              bodyStyle={s.metaBody}
              sectionStyle={s.section}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
