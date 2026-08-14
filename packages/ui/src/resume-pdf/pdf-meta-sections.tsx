import { Text, View } from "@react-pdf/renderer";
import type { PdfStyle } from "./pdf-style";

type Props = {
  languages: Array<{ name: string; level: string }>;
  remoteWorkLine: string | null;
  referencesLine: string | null;
  showLanguages: boolean;
  showRemote: boolean;
  showReferences: boolean;
  titleStyle: PdfStyle;
  bodyStyle: PdfStyle;
  sectionStyle: PdfStyle;
};

export function PdfMetaSections({
  languages,
  remoteWorkLine,
  referencesLine,
  showLanguages,
  showRemote,
  showReferences,
  titleStyle,
  bodyStyle,
  sectionStyle,
}: Props) {
  const langText = languages.map((l) => `${l.name} (${l.level})`).join("  ·  ");
  return (
    <>
      {showLanguages && languages.length > 0 ? (
        <View style={sectionStyle} wrap={false}>
          <Text style={titleStyle}>Languages</Text>
          <Text style={bodyStyle}>{langText}</Text>
        </View>
      ) : null}
      {showRemote && remoteWorkLine ? (
        <View style={sectionStyle} wrap={false}>
          <Text style={titleStyle}>Remote Work</Text>
          <Text style={bodyStyle}>{remoteWorkLine}</Text>
        </View>
      ) : null}
      {showReferences && referencesLine ? (
        <View style={sectionStyle} wrap={false}>
          <Text style={titleStyle}>References</Text>
          <Text style={bodyStyle}>{referencesLine}</Text>
        </View>
      ) : null}
    </>
  );
}
