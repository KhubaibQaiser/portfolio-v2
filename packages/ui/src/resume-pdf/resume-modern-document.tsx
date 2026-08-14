import { Document, Font, Page, Text, View } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { VariantGuidelines } from "@portfolio/shared/schemas";
import { PdfBulletList } from "./pdf-bullet-list";
import { ModernBlueExperienceEntry } from "./modern-blue-experience-entry";
import { ModernBlueHeader } from "./modern-blue-header";
import { createModernBlueStyles, type ModernBlueDensity } from "./modern-blue-print-spec";
import { ModernBlueSectionHeading } from "./modern-blue-section-heading";
import { ModernBlueSidebar } from "./modern-blue-sidebar";
import { ModernBlueSummary } from "./modern-blue-summary";
import { registerResumePdfFonts } from "./register-fonts";
import { showResumePdfSection } from "./section-visibility";

Font.registerHyphenationCallback((word) => [word]);

type Props = {
  data: ResumeData;
  guidelines: VariantGuidelines;
  density?: ModernBlueDensity;
};

export function ResumeModernDocument({ data, guidelines, density = "reference" }: Props) {
  registerResumePdfFonts();
  const styles = createModernBlueStyles(guidelines, density);
  const isVisible = (section: string) => data.visibleSections.includes(section);
  const showSummary =
    isVisible("summary") && guidelines.sections.summary && data.summary.length > 0;
  const showExperience =
    isVisible("experience") &&
    guidelines.sections.experience &&
    data.experience.length > 0;
  const showProjects =
    isVisible("projects") && guidelines.sections.projects && data.projects.length > 0;
  const showSkills =
    isVisible("skills") && guidelines.sections.skills && data.skills.length > 0;
  const showEducation =
    isVisible("education") && guidelines.sections.education && data.education.length > 0;
  const showCertifications =
    isVisible("certifications") &&
    guidelines.sections.certifications &&
    data.certifications.length > 0;
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
  const bulletStyles = {
    list: styles.bulletList,
    row: styles.bulletRow,
    dot: styles.bulletMarker,
    text: styles.bulletText,
  };

  return (
    <Document
      title={`${data.name} - ${data.title} Resume`}
      author={data.name}
      subject={`Resume of ${data.name}, ${data.title}`}
      keywords={data.keywords}
    >
      <Page size="A4" style={styles.page}>
        <ModernBlueHeader data={data} styles={styles} />
        {showSummary ? (
          <ModernBlueSummary summary={data.summary} styles={styles} />
        ) : null}

        <View style={styles.columns}>
          <View style={styles.main}>
            {showExperience ? (
              <View style={styles.section}>
                <ModernBlueSectionHeading styles={styles}>
                  Experience
                </ModernBlueSectionHeading>
                {data.experience.map((experience) => (
                  <ModernBlueExperienceEntry
                    key={`${experience.company}-${experience.period}`}
                    experience={experience}
                    styles={styles}
                  />
                ))}
              </View>
            ) : null}

            {showProjects ? (
              <View style={styles.section}>
                <ModernBlueSectionHeading styles={styles}>
                  Projects
                </ModernBlueSectionHeading>
                {data.projects.map((project) => (
                  <View key={project.name} style={styles.experience}>
                    <Text style={styles.role}>
                      {project.name}
                      {project.status ? ` (${project.status})` : ""}
                    </Text>
                    <PdfBulletList
                      bullets={project.bullets}
                      styles={bulletStyles}
                      boldFont="DM Sans SemiBold"
                      marker="•"
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <ModernBlueSidebar
            data={data}
            highlightSkills={guidelines.formatting.layout.includeTagHighlighting}
            showSkills={showSkills}
            showEducation={showEducation}
            showLanguages={showLanguages}
            showRemote={showRemote}
            showReferences={showReferences}
            showCertifications={showCertifications}
            styles={styles}
          />
        </View>
      </Page>
    </Document>
  );
}
