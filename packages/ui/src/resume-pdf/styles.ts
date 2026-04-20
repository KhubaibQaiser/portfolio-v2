export const COLORS = {
  primary: "#111827",
  body: "#1f2937",
  secondary: "#374151",
  subtle: "#6b7280",
  accent: "#1d4ed8",
  rule: "#d1d5db",
  bg: "#ffffff",
} as const;

export const baseStyles = {
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.body,
    backgroundColor: COLORS.bg,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    lineHeight: 1.4,
  },

  headerName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    letterSpacing: 0.3,
    lineHeight: 1.2,
  },
  headerTitle: {
    fontSize: 11,
    color: COLORS.secondary,
    lineHeight: 1.3,
    marginTop: 3,
  },
  headerContact: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 6,
    fontSize: 9.5,
    color: COLORS.body,
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
  headerRule: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    borderBottomStyle: "solid",
    marginTop: 10,
  },

  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    letterSpacing: 0.3,
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.rule,
    borderBottomStyle: "solid",
    marginBottom: 6,
  },

  summary: {
    fontSize: 10,
    color: COLORS.body,
    lineHeight: 1.5,
  },
} as const;
