import { Text, View } from "@react-pdf/renderer";
import { RichPdfText } from "./rich-pdf-text";
import type { PdfStyle } from "./pdf-style";

type BulletStyle = {
  list: PdfStyle;
  row: PdfStyle;
  dot: PdfStyle;
  text: PdfStyle;
};

type Props = {
  bullets: string[];
  styles: BulletStyle;
  boldFont?: string;
};

export function PdfBulletList({ bullets, styles, boldFont }: Props) {
  return (
    <View style={styles.list}>
      {bullets.map((bullet, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.dot}>-</Text>
          <RichPdfText value={bullet} style={styles.text} boldFont={boldFont} />
        </View>
      ))}
    </View>
  );
}
