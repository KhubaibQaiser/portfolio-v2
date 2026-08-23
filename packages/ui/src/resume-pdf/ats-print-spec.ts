import { StyleSheet } from "@react-pdf/renderer";

const IN = 72;

/**
 * Locked ATS print metrics, ported from the former TeX preamble
 * (A4, Carlito, explicit vertical space — no default paragraph skip).
 * Values are PDF points.
 */
export function createAtsResumeStyles() {
  return StyleSheet.create({
    page: {
      fontFamily: "Carlito",
      fontSize: 9.1,
      color: "#1A1A1A",
      backgroundColor: "#FFFFFF",
      paddingTop: 0.5 * IN,
      paddingBottom: 0.5 * IN,
      paddingLeft: 0.55 * IN,
      paddingRight: 0.55 * IN,
    },
    header: {
      marginBottom: 0,
    },
    name: {
      fontFamily: "Carlito",
      fontWeight: 700,
      fontSize: 22,
      lineHeight: 24 / 22,
      color: "#1A1A1A",
    },
    title: {
      fontFamily: "Carlito",
      fontWeight: 700,
      fontSize: 11.2,
      lineHeight: 13 / 11.2,
      color: "#1A1A1A",
      marginTop: 1,
    },
    contact: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 2.5,
    },
    contactText: {
      fontFamily: "Carlito",
      fontSize: 8.6,
      lineHeight: 11.5 / 8.6,
      color: "#333333",
    },
    contactLink: {
      fontFamily: "Carlito",
      fontSize: 8.6,
      lineHeight: 11.5 / 8.6,
      color: "#333333",
      textDecoration: "none",
    },
    contactSeparator: {
      fontFamily: "Carlito",
      fontSize: 8.6,
      color: "#333333",
    },
    headerRule: {
      marginTop: 2.5,
      marginBottom: 3,
      borderBottomWidth: 1.1,
      borderBottomColor: "#1A1A1A",
    },
    sectionFirst: {
      marginTop: 0,
      marginBottom: 2,
    },
    section: {
      marginTop: 3.2,
      marginBottom: 0.8,
    },
    sectionHeading: {
      fontFamily: "Carlito",
      fontWeight: 700,
      fontSize: 10.3,
      lineHeight: 10.8 / 10.3,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: "#1A1A1A",
    },
    sectionRule: {
      marginTop: 1.5,
      borderBottomWidth: 0.85,
      borderBottomColor: "#1A1A1A",
    },
    summary: {
      fontFamily: "Carlito",
      fontSize: 9.1,
      lineHeight: 10.7 / 9.1,
      color: "#1A1A1A",
      textAlign: "justify",
    },
    skillsLine: {
      fontFamily: "Carlito",
      fontSize: 8.9,
      lineHeight: 10.9 / 8.9,
      color: "#1A1A1A",
      marginTop: 0.9,
    },
    skillsLabel: {
      fontFamily: "Carlito",
      fontWeight: 700,
    },
    roleBlock: {
      marginTop: 0.9,
    },
    roleTitle: {
      fontFamily: "Carlito",
      fontWeight: 700,
      fontSize: 9.8,
      lineHeight: 10.8 / 9.8,
      color: "#1A1A1A",
      marginBottom: 0.3,
    },
    roleMeta: {
      fontFamily: "Carlito",
      fontStyle: "italic",
      fontSize: 8.6,
      lineHeight: 9.3 / 8.6,
      color: "#2B2B2B",
      marginBottom: 0.45,
    },
    bulletList: {
      marginTop: 0,
      paddingLeft: 15,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 0.45,
    },
    bulletMarker: {
      width: 6,
      marginLeft: -15,
      fontFamily: "Carlito",
      fontSize: 9,
      lineHeight: 9.9 / 9,
      color: "#1A1A1A",
    },
    bulletText: {
      flex: 1,
      fontFamily: "Carlito",
      fontSize: 9,
      lineHeight: 9.9 / 9,
      color: "#1A1A1A",
    },
    eduDegree: {
      fontFamily: "Carlito",
      fontSize: 9.4,
      lineHeight: 12 / 9.4,
      color: "#1A1A1A",
      marginBottom: 0.6,
    },
    eduSchool: {
      fontFamily: "Carlito",
      fontStyle: "italic",
      fontSize: 8.7,
      lineHeight: 11 / 8.7,
      color: "#333333",
    },
    langLine: {
      fontFamily: "Carlito",
      fontSize: 9.3,
      lineHeight: 12 / 9.3,
      color: "#1A1A1A",
    },
  });
}

export type AtsResumeStyles = ReturnType<typeof createAtsResumeStyles>;
