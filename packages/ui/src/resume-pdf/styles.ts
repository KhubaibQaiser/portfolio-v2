export const COLORS = {
  primary: "#0f172a",
  body: "#1f2937",
  secondary: "#475569",
  subtle: "#64748b",
  accent: "#1e3a8a",
  rule: "#cbd5e1",
  band: "#f1f5f9",
  bg: "#ffffff",
} as const;

export const baseStyles = {
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.body,
    backgroundColor: COLORS.bg,
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 32,
    lineHeight: 1.4,
  },

  // Tinted full-bleed identity panel. Negative margins cancel the page padding
  // so the band reaches the page edges; a navy baseline anchors the top scan.
  headerBand: {
    marginTop: -28,
    marginHorizontal: -32,
    paddingTop: 28,
    paddingHorizontal: 32,
    paddingBottom: 14,
    backgroundColor: COLORS.band,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.accent,
    borderBottomStyle: "solid",
    marginBottom: 14,
  },
  headerName: {
    fontSize: 23,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    letterSpacing: 0.4,
    lineHeight: 1.15,
  },
  headerTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  headerContact: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 8,
    fontSize: 9.5,
    color: COLORS.secondary,
  },
  headerLink: {
    color: COLORS.accent,
    textDecoration: "none",
    fontSize: 9.5,
  },
  headerSep: {
    color: COLORS.subtle,
    fontSize: 9.5,
  },

  section: { marginTop: 13 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    borderBottomStyle: "solid",
    marginBottom: 7,
  },

  summary: {
    fontSize: 10,
    color: COLORS.body,
    lineHeight: 1.45,
  },
} as const;
