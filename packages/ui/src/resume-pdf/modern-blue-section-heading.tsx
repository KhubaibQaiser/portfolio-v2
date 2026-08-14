import { Text } from "@react-pdf/renderer";
import type { ModernBlueStyles } from "./modern-blue-print-spec";

type Props = {
  children: string;
  styles: ModernBlueStyles;
};

export function ModernBlueSectionHeading({ children, styles }: Props) {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}
