import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Font,
} from "@react-pdf/renderer";
import type { ResumeData } from "@portfolio/shared/resume-data";
import type { CoverLetter } from "@portfolio/ai/schemas/cover-letter";
import { COLORS, baseStyles } from "./styles";

Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  ...baseStyles,

  meta: {
    marginTop: 18,
    fontSize: 10,
    color: COLORS.secondary,
  },
  metaLine: { marginBottom: 1 },
  greeting: {
    marginTop: 18,
    fontSize: 11,
    color: COLORS.body,
  },
  paragraph: {
    marginTop: 10,
    fontSize: 10.5,
    color: COLORS.body,
    lineHeight: 1.55,
  },
  closing: {
    marginTop: 14,
    fontSize: 10.5,
    color: COLORS.body,
    lineHeight: 1.55,
  },
  signOff: {
    marginTop: 22,
    fontSize: 10.5,
    color: COLORS.body,
    lineHeight: 1.45,
  },
});

export type CoverLetterMeta = {
  company?: string;
  role?: string;
  date?: string;
};

export function CoverLetterDocument({
  contact,
  letter,
  meta,
}: {
  contact: ResumeData;
  letter: CoverLetter;
  meta?: CoverLetterMeta;
}) {
  const dateStr =
    meta?.date ??
    new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <Document
      title={`${contact.name} - Cover Letter`}
      author={contact.name}
      subject={`Cover letter from ${contact.name}`}
    >
      <Page size="LETTER" style={s.page}>
        <View>
          <Text style={s.headerName}>{contact.name}</Text>
          <Text style={s.headerTitle}>{contact.title}</Text>
          <View style={s.headerContact}>
            <Text>{contact.location}</Text>
            <Text style={s.headerSep}>&nbsp;|&nbsp;</Text>
            <Link src={`mailto:${contact.email}`} style={s.headerLink}>
              {contact.email}
            </Link>
            <Text style={s.headerSep}>&nbsp;|&nbsp;</Text>
            <Link src={`https://${contact.website}`} style={s.headerLink}>
              {contact.website}
            </Link>
          </View>
          <View style={s.headerRule} />
        </View>

        <View style={s.meta}>
          <Text style={s.metaLine}>{dateStr}</Text>
          {meta?.company && <Text style={s.metaLine}>{meta.company}</Text>}
          {meta?.role && (
            <Text style={s.metaLine}>Re: {meta.role} position</Text>
          )}
        </View>

        <Text style={s.greeting}>{letter.greeting}</Text>

        {letter.body.map((paragraph, i) => (
          <Text key={i} style={s.paragraph}>
            {paragraph}
          </Text>
        ))}

        <Text style={s.closing}>{letter.closing}</Text>

        <Text style={s.signOff}>{letter.signOff}</Text>
      </Page>
    </Document>
  );
}
