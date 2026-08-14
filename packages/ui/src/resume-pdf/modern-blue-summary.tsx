import { View } from "@react-pdf/renderer";
import { RichPdfText } from "./rich-pdf-text";
import type { ModernBlueStyles } from "./modern-blue-print-spec";

type Props = {
  summary: string;
  styles: ModernBlueStyles;
};

export function ModernBlueSummary({ summary, styles }: Props) {
  return (
    <View style={styles.summary}>
      <RichPdfText value={summary} boldFont="DM Sans SemiBold" />
    </View>
  );
}
