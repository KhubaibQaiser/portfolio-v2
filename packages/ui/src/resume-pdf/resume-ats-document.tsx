import { Document, Font, Page, Text, View } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { VariantGuidelines } from "@portfolio/shared/schemas";
import { AtsExperienceEntry } from "./ats-experience-entry";
import { AtsHeader } from "./ats-header";
import { createAtsResumeStyles } from "./ats-print-spec";
import { AtsSectionHeading } from "./ats-section-heading";
import { AtsSkillsLine } from "./ats-skills-line";
import { PdfBulletList } from "./pdf-bullet-list";
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
  const showSummary = guidelines.sections.summary && data.summary.length > 0;
  const showSkills = showResumePdfSection(data, guidelines, "skills", "skills");
  const showExperience = showResumePdfSection(
    data,
    guidelines,
    "experience",
    "experience",
  );
  const showEducation = showResumePdfSection(data, guidelines, "education", "education");
  const showLanguages = showResumePdfSection(data, guidelines, "languages", "languages");
  const showProjects = showResumePdfSection(data, guidelines, "projects", "projects");

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
          <View>
            {heading("Professional Summary")}
            <Text style={styles.summary}>{stripAtsMarkdownBold(data.summary)}</Text>
          </View>
        ) : null}

        {showSkills && data.skills.length > 0 ? (
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

        {showExperience && data.experience.length > 0 ? (
          <View>
            {heading("Professional Experience")}
            {data.experience.map((experience) => (
              <AtsExperienceEntry
                key={`${experience.company}-${experience.period}`}
                experience={experience}
                styles={styles}
              />
            ))}
          </View>
        ) : null}

        {showEducation && data.education.length > 0 ? (
          <View>
            {heading("Education")}
            {data.education.map((edu) => (
              <View key={`${edu.institution}-${edu.year}`}>
                <Text style={styles.eduDegree}>{edu.degree}</Text>
                <Text style={styles.eduSchool}>
                  {edu.institution} | {edu.year}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {showLanguages && data.languages.length > 0 ? (
          <View>
            {heading("Languages")}
            <Text style={styles.langLine}>
              {data.languages.map((lang) => `${lang.name} (${lang.level})`).join(" | ")}
            </Text>
          </View>
        ) : null}

        {showProjects && data.projects.length > 0 ? (
          <View>
            {heading("Personal Projects")}
            {data.projects.map((project) => (
              <View key={project.name} style={styles.roleBlock}>
                <Text style={styles.roleTitle}>
                  {project.status ? `${project.name} (${project.status})` : project.name}
                </Text>
                <PdfBulletList
                  bullets={project.bullets.map(stripAtsMarkdownBold)}
                  styles={{
                    list: styles.bulletList,
                    row: styles.bulletRow,
                    dot: styles.bulletMarker,
                    text: styles.bulletText,
                  }}
                  marker={"\u2022"}
                  richText={false}
                />
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
