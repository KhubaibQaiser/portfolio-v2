import { Document, Font, Page, Text, View } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { VariantGuidelines } from "@portfolio/shared/schemas";
import { AtsExperienceEntry } from "./ats-experience-entry";
import { AtsHeader } from "./ats-header";
import { AtsProjectEntry } from "./ats-project-entry";
import { createAtsResumeStyles } from "./ats-print-spec";
import { AtsSectionHeading } from "./ats-section-heading";
import { AtsSkillsLine } from "./ats-skills-line";
import { registerResumePdfFonts } from "./register-fonts";
import { showResumePdfSection } from "./section-visibility";
import { stripAtsMarkdownBold } from "./strip-ats-markdown";

Font.registerHyphenationCallback((word) => [word]);

type Props = {
  data: ResumeData;
  guidelines: VariantGuidelines;
};

export function ResumeAtsDocument({ data, guidelines }: Props) {
  registerResumePdfFonts();
  const styles = createAtsResumeStyles();
  const showSummary = guidelines.sections.summary && data.summary.trim().length > 0;
  const showSkills =
    showResumePdfSection(data, guidelines, "skills", "skills") && data.skills.length > 0;
  const showExperience =
    showResumePdfSection(data, guidelines, "experience", "experience") &&
    data.experience.length > 0;
  const showProjects =
    showResumePdfSection(data, guidelines, "projects", "projects") &&
    data.projects.length > 0;
  const showEducation =
    showResumePdfSection(data, guidelines, "education", "education") &&
    data.education.length > 0;
  const showLanguages =
    showResumePdfSection(data, guidelines, "languages", "languages") &&
    data.languages.length > 0;
  const showCertifications =
    showResumePdfSection(data, guidelines, "certifications", "certifications") &&
    data.certifications.length > 0;
  const showRemote =
    showResumePdfSection(data, guidelines, "remote", "remoteWorkExperience") &&
    Boolean(data.remoteWorkLine?.trim());
  const showReferences =
    showResumePdfSection(data, guidelines, "references", "references") &&
    Boolean(data.referencesLine?.trim());

  let firstSection = true;
  const heading = (title: string) => {
    const first = firstSection;
    firstSection = false;
    return (
      <AtsSectionHeading first={first} styles={styles}>
        {title}
      </AtsSectionHeading>
    );
  };

  return (
    <Document
      title={`${data.name} - ${data.title} Resume`}
      author={data.name}
      subject={`Resume of ${data.name}, ${data.title}`}
      keywords={data.keywords}
    >
      <Page size="A4" style={styles.page}>
        <AtsHeader data={data} styles={styles} />

        {showSummary ? (
          <View wrap={false}>
            {heading("Professional Summary")}
            <Text style={styles.summary}>{stripAtsMarkdownBold(data.summary)}</Text>
          </View>
        ) : null}

        {showSkills ? (
          <View>
            {heading("Technical Skills")}
            {data.skills.map((group) => (
              <AtsSkillsLine
                key={group.category}
                category={group.category}
                items={group.items}
                styles={styles}
              />
            ))}
          </View>
        ) : null}

        {showExperience ? (
          <View>
            {heading("Professional Experience")}
            {data.experience.map((experience, index) => (
              <AtsExperienceEntry
                key={`${experience.company}-${experience.period}`}
                experience={experience}
                first={index === 0}
                styles={styles}
              />
            ))}
          </View>
        ) : null}

        {showProjects ? (
          <View>
            {heading("Projects")}
            {data.projects.map((project, index) => (
              <AtsProjectEntry
                key={project.name}
                project={project}
                first={index === 0}
                styles={styles}
              />
            ))}
          </View>
        ) : null}

        {showEducation ? (
          <View wrap={false}>
            {heading("Education")}
            {data.education.map((edu, index) => (
              <View
                key={`${edu.institution}-${edu.year}`}
                style={index === 0 ? styles.eduBlockFirst : styles.eduBlock}
                wrap={false}
              >
                <Text style={styles.eduDegree}>{edu.degree}</Text>
                <Text style={styles.eduSchool}>
                  {edu.institution} | {edu.year}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {showLanguages ? (
          <View wrap={false}>
            {heading("Languages")}
            <Text style={styles.metaLine}>
              {data.languages.map((lang) => `${lang.name} (${lang.level})`).join(" | ")}
            </Text>
          </View>
        ) : null}

        {showCertifications ? (
          <View wrap={false}>
            {heading("Certifications")}
            <Text style={styles.metaLine}>
              {data.certifications
                .map((cert) =>
                  cert.issuer.trim() ? `${cert.name} | ${cert.issuer}` : cert.name,
                )
                .join(" | ")}
            </Text>
          </View>
        ) : null}

        {showRemote ? (
          <View wrap={false}>
            {heading("Remote Work")}
            <Text style={styles.metaLine}>{data.remoteWorkLine}</Text>
          </View>
        ) : null}

        {showReferences ? (
          <View wrap={false}>
            {heading("References")}
            <Text style={styles.metaLine}>{data.referencesLine}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
