import { StyleSheet } from "@react-pdf/renderer";

const MM = 72 / 25.4;
const FONT = "Carlito";
const INK = "#1A1A1A";
const MUTED = "#333333";
const NAVY = "#1B3A4B";
const RULE = "#1A1A1A";

/**
 * Locked ATS print metrics for a compact senior A4 page.
 * Values are PDF points. Spacing uses a 2/4/6/8/10/12 scale.
 */
export function createAtsResumeStyles() {
  return StyleSheet.create({
    page: {
      fontFamily: FONT,
      fontSize: 9.5,
      color: INK,
      backgroundColor: "#FFFFFF",
      paddingTop: 13 * MM,
      paddingBottom: 13 * MM,
      paddingLeft: 14 * MM,
      paddingRight: 14 * MM,
    },
    header: {
      marginBottom: 0,
    },
    name: {
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 22,
      lineHeight: 1.05,
      color: NAVY,
      marginBottom: 2,
    },
    title: {
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 11,
      lineHeight: 1.1,
      color: INK,
    },
    contact: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 2,
    },
    contactText: {
      fontFamily: FONT,
      fontSize: 9,
      lineHeight: 1.08,
      color: MUTED,
    },
    contactLink: {
      fontFamily: FONT,
      fontSize: 9,
      lineHeight: 1.08,
      color: MUTED,
      textDecoration: "none",
    },
    contactSeparator: {
      fontFamily: FONT,
      fontSize: 9,
      color: MUTED,
    },
    headerRule: {
      marginTop: 2,
      marginBottom: 0,
      borderBottomWidth: 1,
      borderBottomColor: RULE,
    },
    sectionFirst: {
      marginTop: 0,
      marginBottom: 4,
    },
    section: {
      marginTop: 8,
      marginBottom: 4,
    },
    sectionHeading: {
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 11,
      lineHeight: 1.05,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: NAVY,
    },
    sectionRule: {
      marginTop: 2,
      borderBottomWidth: 0.85,
      borderBottomColor: RULE,
    },
    summary: {
      fontFamily: FONT,
      fontSize: 9.5,
      lineHeight: 1.08,
      color: INK,
    },
    skillsLine: {
      fontFamily: FONT,
      fontSize: 8.5,
      lineHeight: 1.05,
      color: INK,
      marginTop: 2,
    },
    skillsLabel: {
      fontFamily: FONT,
      fontWeight: 700,
    },
    roleBlockFirst: {
      marginTop: 0,
    },
    roleBlock: {
      marginTop: 4,
    },
    companyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 2,
    },
    companyName: {
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 10,
      lineHeight: 1.1,
      color: INK,
      flexGrow: 1,
      flexShrink: 1,
      paddingRight: 8,
    },
    period: {
      fontFamily: FONT,
      fontSize: 9,
      lineHeight: 1.1,
      color: MUTED,
      flexShrink: 0,
      textAlign: "right",
    },
    roleLine: {
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 9.5,
      lineHeight: 1.1,
      color: INK,
      marginBottom: 2,
    },
    roleLocation: {
      fontFamily: FONT,
      fontWeight: 400,
      fontSize: 8.5,
      color: MUTED,
    },
    bulletList: {
      marginTop: 0,
      paddingLeft: 12,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 2,
    },
    bulletMarker: {
      width: 10,
      marginLeft: -12,
      fontFamily: FONT,
      fontSize: 9,
      lineHeight: 1.05,
      color: INK,
    },
    bulletText: {
      flex: 1,
      fontFamily: FONT,
      fontSize: 9,
      lineHeight: 1.05,
      color: INK,
    },
    projectBlockFirst: {
      marginTop: 0,
    },
    projectBlock: {
      marginTop: 6,
    },
    projectName: {
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 9.5,
      lineHeight: 1.1,
      color: INK,
      marginBottom: 2,
    },
    projectStatus: {
      fontFamily: FONT,
      fontWeight: 400,
      fontSize: 8.5,
      color: MUTED,
    },
    projectBulletList: {
      marginTop: 2,
      paddingLeft: 12,
    },
    projectBulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 2,
    },
    projectBulletMarker: {
      width: 10,
      marginLeft: -12,
      fontFamily: FONT,
      fontSize: 8.5,
      lineHeight: 1.05,
      color: INK,
    },
    projectBulletText: {
      flex: 1,
      fontFamily: FONT,
      fontSize: 8.5,
      lineHeight: 1.05,
      color: INK,
    },
    eduBlockFirst: {
      marginTop: 0,
    },
    eduBlock: {
      marginTop: 4,
    },
    eduDegree: {
      fontFamily: FONT,
      fontSize: 9.5,
      lineHeight: 1.1,
      color: INK,
      marginBottom: 2,
    },
    eduSchool: {
      fontFamily: FONT,
      fontSize: 8.5,
      lineHeight: 1.1,
      color: MUTED,
    },
    metaLine: {
      fontFamily: FONT,
      fontSize: 9,
      lineHeight: 1.08,
      color: INK,
    },
  });
}

export type AtsResumeStyles = ReturnType<typeof createAtsResumeStyles>;
