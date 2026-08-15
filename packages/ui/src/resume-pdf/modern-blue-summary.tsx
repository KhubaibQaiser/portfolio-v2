import { View } from "@react-pdf/renderer";
import { RichPdfText } from "./rich-pdf-text";
import type { ModernBlueStyles } from "./modern-blue-print-spec";

type Props = {
  summary: string;
  richText: boolean;
  styles: ModernBlueStyles;
};

export function ModernBlueSummary({ summary, richText, styles }: Props) {
  return (
    <View style={styles.summary}>
      <RichPdfText value={summary} boldFont="DM Sans SemiBold" enabled={richText} />
    </View>
  );
}
