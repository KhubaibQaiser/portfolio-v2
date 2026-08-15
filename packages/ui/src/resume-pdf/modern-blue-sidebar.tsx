import { Text, View } from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { ModernBlueStyles } from "./modern-blue-print-spec";
import { ModernBlueSectionHeading } from "./modern-blue-section-heading";
import { ModernBlueSkillTags } from "./modern-blue-skill-tags";

type Props = {
  data: ResumeData;
  highlightedSkills: readonly string[];
  showSkills: boolean;
  showEducation: boolean;
  showLanguages: boolean;
  showRemote: boolean;
  showReferences: boolean;
  showCertifications: boolean;
  styles: ModernBlueStyles;
};

export function ModernBlueSidebar({
  data,
  highlightedSkills,
  showSkills,
  showEducation,
  showLanguages,
  showRemote,
  showReferences,
  showCertifications,
  styles,
}: Props) {
  const highlightedSkillSet = new Set(
    highlightedSkills.map((skill) => skill.trim().toLocaleLowerCase()),
  );
  return (
    <View style={styles.sidebar}>
      {showSkills
        ? data.skills.map((group) => (
            <ModernBlueSkillTags
              key={group.category}
              group={group}
              highlightedSkills={highlightedSkillSet}
              styles={styles}
            />
          ))
        : null}

      {showEducation ? (
        <View style={styles.section} wrap={false}>
          <ModernBlueSectionHeading styles={styles}>Education</ModernBlueSectionHeading>
          {data.education.map((education) => (
            <View key={`${education.degree}-${education.institution}`}>
              <Text style={[styles.education, styles.educationDegree]}>
                {education.degree}
              </Text>
              <Text style={styles.educationMeta}>
                {education.institution}
                {"\n"}
                {education.year}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {showCertifications ? (
        <View style={styles.section} wrap={false}>
          <ModernBlueSectionHeading styles={styles}>
            Certifications
          </ModernBlueSectionHeading>
          {data.certifications.map((certification) => (
            <Text key={certification.name} style={styles.educationMeta}>
              {certification.name}
              {certification.issuer ? ` · ${certification.issuer}` : ""}
            </Text>
          ))}
        </View>
      ) : null}

      {showLanguages ? (
        <View style={styles.section} wrap={false}>
          <ModernBlueSectionHeading styles={styles}>Languages</ModernBlueSectionHeading>
          {data.languages.map((language) => (
            <View key={language.name} style={styles.languageRow}>
              <Text style={styles.languageName}>{language.name}</Text>
              <Text style={styles.languageLevel}>{language.level}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {showRemote && data.remoteWorkLine ? (
        <View style={styles.section} wrap={false}>
          <ModernBlueSectionHeading styles={styles}>Remote Work</ModernBlueSectionHeading>
          <Text style={styles.remoteNote}>{data.remoteWorkLine}</Text>
        </View>
      ) : null}

      {showReferences && data.referencesLine ? (
        <View style={styles.section} wrap={false}>
          <ModernBlueSectionHeading styles={styles}>References</ModernBlueSectionHeading>
          <Text style={styles.remoteNote}>{data.referencesLine}</Text>
        </View>
      ) : null}
    </View>
  );
}
