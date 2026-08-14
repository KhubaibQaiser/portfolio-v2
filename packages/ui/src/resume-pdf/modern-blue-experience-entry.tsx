import { Text, View } from "@react-pdf/renderer";
import type { ResumeDataExperience } from "@portfolio/shared/resume-data";
import { RichPdfText } from "./rich-pdf-text";
import type { ModernBlueStyles } from "./modern-blue-print-spec";

type Props = {
  experience: ResumeDataExperience;
  styles: ModernBlueStyles;
};

export function ModernBlueExperienceEntry({ experience, styles }: Props) {
  const [location, workMode] = experience.location.split(" · ", 2);
  const badge = [experience.contractType, workMode].filter(Boolean).join(" · ");

  return (
    <View style={styles.experience} minPresenceAhead={24}>
      <View style={styles.experienceHeader}>
        <Text style={styles.role}>{experience.role}</Text>
        <Text style={styles.period}>{experience.period}</Text>
      </View>
      <View style={styles.experienceMeta}>
        <Text style={styles.experienceMetaText}>
          {experience.company}
          {location ? ` · ${location}` : ""}
        </Text>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </View>
      <View style={styles.bulletList}>
        {experience.bullets.map((bullet, index) => (
          <View key={`${index}-${bullet}`} style={styles.bulletRow}>
            <Text style={styles.bulletMarker}>•</Text>
            <RichPdfText
              value={bullet}
              style={styles.bulletText}
              boldFont="DM Sans SemiBold"
            />
          </View>
        ))}
      </View>
    </View>
  );
}
