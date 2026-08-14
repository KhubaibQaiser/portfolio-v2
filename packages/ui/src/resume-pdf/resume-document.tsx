import { Document, Page, Text, View, StyleSheet, Link, Font } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { VariantGuidelines } from "@portfolio/shared/schemas";
import { COLORS, baseStyles } from "./styles";
import { PdfBulletList } from "./pdf-bullet-list";
import { PdfMetaSections } from "./pdf-meta-sections";
import { RichPdfText } from "./rich-pdf-text";
import { showResumePdfSection } from "./section-visibility";

Font.registerHyphenationCallback((word) => [word]);

const SHORT_ENTRY_BULLET_LIMIT = 8;

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
  projectName: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  projectStatus: {
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: COLORS.secondary,
  },
  bulletList: { marginTop: 3, paddingLeft: 10 },
  bulletRow: { flexDirection: "row", marginBottom: 2 },
  bulletDot: { width: 10, fontSize: 10, color: COLORS.accent },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    color: COLORS.body,
    lineHeight: 1.35,
  },
  skillLine: { fontSize: 9.5, color: COLORS.body, marginBottom: 3, lineHeight: 1.35 },
  skillCategory: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
  },
  eduLine: { fontSize: 9.5, color: COLORS.body, lineHeight: 1.35 },
  certRow: { flexDirection: "row", marginBottom: 2 },
  certBullet: { width: 10, fontSize: 10, color: COLORS.accent },
  certText: { flex: 1, fontSize: 9.5, color: COLORS.body },
  certIssuer: { color: COLORS.secondary },
  metaBody: { fontSize: 9.5, color: COLORS.body, lineHeight: 1.35 },
});

function socialLinkLabel(link: { platform: string; label: string }): string {
  const trimmed = link.label.trim();
  if (trimmed) return trimmed;
  return link.platform;
}

function formatEducationLine(edu: ResumeData["education"][number]): string {
  return `${edu.degree}, ${edu.institution} · ${edu.year}`;
}

export function ResumeDocument({
  data,
  guidelines,
}: {
  data: ResumeData;
  guidelines?: VariantGuidelines;
}) {
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

  const pageSize = guidelines?.formatting.layout.pageSize ?? "LETTER";

  const [firstExp, ...restExp] = data.experience;
  const [firstProject, ...restProjects] = data.projects;
  const [firstEdu, ...restEdu] = data.education;
  const [firstCert, ...restCerts] = data.certifications;
  const [firstSkill, ...restSkills] = data.skills;

  return (
    <Document
      title={`${data.name} - ${data.title} Resume`}
      author={data.name}
      subject={`Resume of ${data.name}, ${data.title}`}
      keywords={data.keywords}
    >
      <Page size={pageSize} style={s.page}>
        <View style={s.headerBand}>
          <Text style={s.headerName}>{data.name}</Text>
          <Text style={s.headerTitle}>{data.title}</Text>

          <View style={s.headerContact}>
            <Text>{data.location}</Text>
            {data.phone ? (
              <>
                <Text style={s.headerSep}>&nbsp;|&nbsp;</Text>
                <Link src={data.phone} style={s.headerLink}>
                  {data.phone.replace("tel:", "")}
                </Link>
              </>
            ) : null}
            <Text style={s.headerSep}>&nbsp;|&nbsp;</Text>
            <Link src={`mailto:${data.email}`} style={s.headerLink}>
              {data.email}
            </Link>
            <Text style={s.headerSep}>&nbsp;|&nbsp;</Text>
            <Link src={`https://${data.website}`} style={s.headerLink}>
              Portfolio
            </Link>
            {data.socialLinks
              .filter((l) => ["linkedin", "github"].includes(l.platform))
              .flatMap((link) => [
                <Text key={`${link.platform}-sep`} style={s.headerSep}>
                  &nbsp;|&nbsp;
                </Text>,
                <Link key={link.platform} src={link.url} style={s.headerLink}>
                  {socialLinkLabel(link)}
                </Link>,
              ])}
          </View>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.sectionTitle}>Professional Summary</Text>
          <RichPdfText value={data.summary} style={s.summary} />
        </View>

        {showExperience ? (
          <View style={s.section}>
            <View wrap={false}>
              <Text style={s.sectionTitle}>Work Experience</Text>
              {firstExp ? (
                <View
                  style={s.expEntry}
                  wrap={
                    firstExp.bullets.length > SHORT_ENTRY_BULLET_LIMIT ? undefined : false
                  }
                >
                  <View style={s.expHeaderBlock} wrap={false}>
                    <View style={s.expHeader}>
                      <Text style={s.expRole}>{firstExp.role}</Text>
                      <Text style={s.expPeriod}>{firstExp.period}</Text>
                    </View>
                    <View style={s.expSubHeader}>
                      <Text style={s.expCompany}>
                        {firstExp.company}
                        {firstExp.contractType ? (
                          <Text
                            style={s.expContractType}
                          >{` · ${firstExp.contractType}`}</Text>
                        ) : null}
                      </Text>
                      <Text style={s.expLocation}>{firstExp.location}</Text>
                    </View>
                  </View>
                  <PdfBulletList
                    bullets={firstExp.bullets}
                    styles={{
                      list: s.bulletList,
                      row: s.bulletRow,
                      dot: s.bulletDot,
                      text: s.bulletText,
                    }}
                  />
                </View>
              ) : null}
            </View>
            {restExp.map((exp) => (
              <View
                key={`${exp.company}-${exp.period}`}
                style={s.expEntry}
                wrap={exp.bullets.length > SHORT_ENTRY_BULLET_LIMIT ? undefined : false}
              >
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
                <PdfBulletList
                  bullets={exp.bullets}
                  styles={{
                    list: s.bulletList,
                    row: s.bulletRow,
                    dot: s.bulletDot,
                    text: s.bulletText,
                  }}
                />
              </View>
            ))}
          </View>
        ) : null}

        {showProjects ? (
          <View style={s.section}>
            <View wrap={false}>
              <Text style={s.sectionTitle}>Projects</Text>
              {firstProject ? (
                <View
                  style={s.expEntry}
                  wrap={
                    firstProject.bullets.length > SHORT_ENTRY_BULLET_LIMIT
                      ? undefined
                      : false
                  }
                >
                  <View style={s.expHeaderBlock} wrap={false}>
                    <Text style={s.projectName}>
                      {firstProject.name}
                      {firstProject.status ? (
                        <Text style={s.projectStatus}>{` (${firstProject.status})`}</Text>
                      ) : null}
                    </Text>
                  </View>
                  <PdfBulletList
                    bullets={firstProject.bullets}
                    styles={{
                      list: s.bulletList,
                      row: s.bulletRow,
                      dot: s.bulletDot,
                      text: s.bulletText,
                    }}
                  />
                </View>
              ) : null}
            </View>
            {restProjects.map((project) => (
              <View
                key={project.name}
                style={s.expEntry}
                wrap={
                  project.bullets.length > SHORT_ENTRY_BULLET_LIMIT ? undefined : false
                }
              >
                <View style={s.expHeaderBlock} wrap={false}>
                  <Text style={s.projectName}>
                    {project.name}
                    {project.status ? (
                      <Text style={s.projectStatus}>{` (${project.status})`}</Text>
                    ) : null}
                  </Text>
                </View>
                <PdfBulletList
                  bullets={project.bullets}
                  styles={{
                    list: s.bulletList,
                    row: s.bulletRow,
                    dot: s.bulletDot,
                    text: s.bulletText,
                  }}
                />
              </View>
            ))}
          </View>
        ) : null}

        {showEducation ? (
          <View style={s.section}>
            <View wrap={false}>
              <Text style={s.sectionTitle}>Education</Text>
              {firstEdu ? (
                <Text style={s.eduLine}>{formatEducationLine(firstEdu)}</Text>
              ) : null}
            </View>
            {restEdu.map((edu) => (
              <Text key={edu.institution} style={s.eduLine}>
                {formatEducationLine(edu)}
              </Text>
            ))}
          </View>
        ) : null}

        {showCertifications ? (
          <View style={s.section}>
            <View wrap={false}>
              <Text style={s.sectionTitle}>Certifications</Text>
              {firstCert ? (
                <View style={s.certRow}>
                  <Text style={s.certBullet}>-</Text>
                  <Text style={s.certText}>
                    {firstCert.name}
                    {firstCert.issuer ? (
                      <Text style={s.certIssuer}>{` (${firstCert.issuer})`}</Text>
                    ) : null}
                  </Text>
                </View>
              ) : null}
            </View>
            {restCerts.map((cert) => (
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
        ) : null}

        {showSkills ? (
          <View style={s.section}>
            <View wrap={false}>
              <Text style={s.sectionTitle}>Technical Skills</Text>
              {firstSkill ? (
                <Text style={s.skillLine}>
                  <Text style={s.skillCategory}>{firstSkill.category}: </Text>
                  {firstSkill.items.join(", ")}
                </Text>
              ) : null}
            </View>
            {restSkills.map((group) => (
              <Text key={group.category} style={s.skillLine}>
                <Text style={s.skillCategory}>{group.category}: </Text>
                {group.items.join(", ")}
              </Text>
            ))}
          </View>
        ) : null}

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
      </Page>
    </Document>
  );
}
