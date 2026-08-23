import { Text } from "@react-pdf/renderer";
import type { AtsResumeStyles } from "./ats-print-spec";

type Props = {
  category: string;
  items: string[];
  styles: AtsResumeStyles;
};

export function AtsSkillsLine({ category, items, styles }: Props) {
  return (
    <Text style={styles.skillsLine}>
      <Text style={styles.skillsLabel}>{category}:</Text>
      {` ${items.join(", ")}`}
    </Text>
  );
}
