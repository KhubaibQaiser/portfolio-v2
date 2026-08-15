import { Text } from "@react-pdf/renderer";
import { parseRichText } from "./parse-rich-text";
import type { PdfStyle } from "./pdf-style";

type Props = {
  value: string;
  style?: PdfStyle;
  boldFont?: string;
  enabled?: boolean;
};

export function RichPdfText({
  value,
  style,
  boldFont = "Helvetica-Bold",
  enabled = true,
}: Props) {
  const segments = parseRichText(value);
  if (!enabled) {
    return (
      <Text style={style}>{segments.map((segment) => segment.text).join("") || " "}</Text>
    );
  }
  if (segments.length === 0) {
    return <Text style={style}> </Text>;
  }
  if (segments.length === 1 && !segments[0]!.bold) {
    return <Text style={style}>{segments[0]!.text}</Text>;
  }
  return (
    <Text style={style}>
      {segments.map((segment, index) =>
        segment.bold ? (
          <Text key={index} style={{ fontFamily: boldFont }}>
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        ),
      )}
    </Text>
  );
}
