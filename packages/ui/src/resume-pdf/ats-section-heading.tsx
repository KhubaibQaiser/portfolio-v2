import { Text, View } from "@react-pdf/renderer";
import type { AtsResumeStyles } from "./ats-print-spec";

type Props = {
  first?: boolean;
  styles: AtsResumeStyles;
  children: string;
};

export function AtsSectionHeading({ first = false, styles, children }: Props) {
  return (
    <View style={first ? styles.sectionFirst : styles.section}>
      <Text style={styles.sectionHeading}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}
