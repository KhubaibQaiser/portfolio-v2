import { Text, View } from "@react-pdf/renderer";
import type { ResumeDataExperience } from "@portfolio/shared/resume-data";
import { formatAtsEmploymentPeriod } from "./format-ats-employment-period";
import { PdfBulletList } from "./pdf-bullet-list";
import { stripAtsMarkdownBold } from "./strip-ats-markdown";
import type { AtsResumeStyles } from "./ats-print-spec";

type Props = {
  experience: ResumeDataExperience;
  first?: boolean;
  styles: AtsResumeStyles;
};

export function AtsExperienceEntry({ experience, first = false, styles }: Props) {
  const location = experience.location.trim();

  return (
    <View style={first ? styles.roleBlockFirst : styles.roleBlock}>
      <View style={styles.companyRow} wrap={false}>
        <Text style={styles.companyName}>{experience.company}</Text>
        <Text style={styles.period}>{formatAtsEmploymentPeriod(experience.period)}</Text>
      </View>
      <Text style={styles.roleLine} wrap={false}>
        {experience.role}
        {location ? <Text style={styles.roleLocation}>{` · ${location}`}</Text> : null}
      </Text>
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
