import { Text, View } from "@react-pdf/renderer";
import type { ResumeDataExperience } from "@portfolio/shared/resume-data";
import { formatAtsEmploymentPeriod } from "./format-ats-employment-period";
import { PdfBulletList } from "./pdf-bullet-list";
import { stripAtsMarkdownBold } from "./strip-ats-markdown";
import type { AtsResumeStyles } from "./ats-print-spec";

type Props = {
  experience: ResumeDataExperience;
  styles: AtsResumeStyles;
};

export function AtsExperienceEntry({ experience, styles }: Props) {
  const meta = [
    experience.company,
    experience.location,
    formatAtsEmploymentPeriod(experience.period),
  ].join(" | ");

  return (
    <View style={styles.roleBlock}>
      <Text style={styles.roleTitle}>{experience.role}</Text>
      <Text style={styles.roleMeta}>{meta}</Text>
      <PdfBulletList
        bullets={experience.bullets.map(stripAtsMarkdownBold)}
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
  );
}
