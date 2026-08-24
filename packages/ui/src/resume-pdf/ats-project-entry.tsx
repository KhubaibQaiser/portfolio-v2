import { Text, View } from "@react-pdf/renderer";
import type { ResumeDataProject } from "@portfolio/shared/resume-data";
import { PdfBulletList } from "./pdf-bullet-list";
import { stripAtsMarkdownBold } from "./strip-ats-markdown";
import type { AtsResumeStyles } from "./ats-print-spec";

type Props = {
  project: ResumeDataProject;
  first?: boolean;
  styles: AtsResumeStyles;
};

export function AtsProjectEntry({ project, first = false, styles }: Props) {
  const status = project.status?.trim();

  return (
    <View style={first ? styles.projectBlockFirst : styles.projectBlock}>
      <Text style={styles.projectName} wrap={false}>
        {project.name}
        {status ? <Text style={styles.projectStatus}>{` (${status})`}</Text> : null}
      </Text>
      <PdfBulletList
        bullets={project.bullets.map(stripAtsMarkdownBold)}
        styles={{
          list: styles.projectBulletList,
          row: styles.projectBulletRow,
          dot: styles.projectBulletMarker,
          text: styles.projectBulletText,
        }}
        marker={"\u2022"}
        richText={false}
      />
    </View>
  );
}
