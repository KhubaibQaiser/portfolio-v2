import { StyleSheet } from "@react-pdf/renderer";
import type { VariantGuidelines } from "@portfolio/shared/schemas";

export type ModernBlueDensity = "reference" | "elegantCompact" | "fitCompact";

const PX = 0.75;
const px = (value: number): number => value * PX;

const DENSITY = {
  reference: { section: 1, job: 1, bullet: 1, chip: 1 },
  elegantCompact: { section: 0.94, job: 0.94, bullet: 0.94, chip: 0.96 },
  fitCompact: { section: 0.88, job: 0.88, bullet: 0.9, chip: 0.92 },
} as const;

function parsePageMargins(value: string) {
  const read = (label: string): string | null => {
    const match = value.match(new RegExp(`([\\d.]+mm)\\s+${label}`, "i"));
    return match?.[1] ?? null;
  };
  const horizontal = read("horizontal");
  return {
    top: read("top") ?? "10mm",
    right: read("right") ?? horizontal ?? "11mm",
    bottom: read("bottom") ?? "8mm",
    left: read("left") ?? horizontal ?? "11mm",
  };
}

export function createModernBlueStyles(
  guidelines: VariantGuidelines,
  density: ModernBlueDensity,
) {
  const scale = DENSITY[density];
  const palette = guidelines.formatting.colorPalette;
  const blue = palette.primary ?? "#2C6EF2";
  const ink = palette.ink ?? "#1A1A1A";
  const muted = palette.gray ?? "#555550";
  const pale = palette.pale ?? "#EEF3FE";
  const rule = palette.rule ?? "#E5E0D8";
  const headingSizes = guidelines.formatting.typography.headingSizes;
  const bodySizes = guidelines.formatting.typography.bodySizes;
  const spacing = guidelines.formatting.spacing;
  const layout = guidelines.formatting.layout;
  const margins = parsePageMargins(spacing.pageMargins);

  return StyleSheet.create({
    page: {
      fontFamily: "DM Sans",
      fontSize: px(10.5),
      lineHeight: 1.5,
      color: ink,
      backgroundColor: "#FFFFFF",
      paddingTop: margins.top,
      paddingRight: margins.right,
      paddingBottom: margins.bottom,
      paddingLeft: margins.left,
    },
    header: {
      paddingBottom: px(9),
      borderBottomWidth: px(2),
      borderBottomColor: ink,
      marginBottom: px(10),
    },
    name: {
      fontFamily: "DM Serif Display",
      fontSize: headingSizes.name ?? px(28),
      letterSpacing: px(-0.3),
      // DM Serif Display's ascender/descender box exceeds 1em, so a 1.0 line
      // height overlaps the tagline below it.
      lineHeight: 1.2,
      color: ink,
      marginBottom: px(7),
    },
    title: {
      fontFamily: "DM Sans Medium",
      fontSize: headingSizes.title ?? px(10),
      color: blue,
      letterSpacing: px(0.8),
      textTransform: "uppercase",
      marginBottom: px(5),
    },
    contact: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      fontSize: bodySizes.contact ?? px(9),
      color: muted,
    },
    contactLink: {
      color: blue,
      textDecoration: "none",
    },
    contactSeparator: {
      color: muted,
    },
    summary: {
      backgroundColor: pale,
      borderLeftWidth: px(3),
      borderLeftColor: blue,
      borderTopRightRadius: px(4),
      borderBottomRightRadius: px(4),
      paddingVertical: px(7),
      paddingHorizontal: px(11),
      marginBottom: px(12),
      fontSize: bodySizes.summary ?? px(10),
      lineHeight: 1.6,
      color: ink,
    },
    columns: {
      flexDirection: "row",
      gap: px(16),
      alignItems: "flex-start",
    },
    main: {
      width: layout.leftColumnWidth || px(502.7),
      minWidth: 0,
    },
    sidebar: {
      width: layout.rightColumnWidth || px(192),
    },
    section: {
      marginBottom: spacing.sectionGap * scale.section,
    },
    sectionHeading: {
      fontFamily: "DM Sans SemiBold",
      fontSize: headingSizes.section ?? px(8),
      letterSpacing: px(1.12),
      textTransform: "uppercase",
      color: blue,
      paddingBottom: px(3),
      marginBottom: px(6) * scale.section,
      borderBottomWidth: px(1),
      borderBottomColor: rule,
    },
    experience: {
      marginBottom: spacing.jobGap * scale.job,
    },
    experienceHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: px(6),
    },
    role: {
      flex: 1,
      fontFamily: "DM Sans SemiBold",
      fontSize: headingSizes.job ?? px(10.5),
      color: ink,
    },
    period: {
      fontSize: bodySizes.meta ?? px(8.5),
      color: muted,
    },
    experienceMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      // Top-aligned rather than centered: react-pdf puts a line's extra leading
      // below the baseline, so centering the boxes would offset the badge text
      // from the company line. Top alignment plus the badge's padding lands
      // both baselines together.
      alignItems: "flex-start",
      marginTop: px(1),
      marginBottom: px(4) * scale.job,
    },
    experienceMetaText: {
      fontSize: bodySizes.meta ?? px(9),
      // Matches the badge line height so `alignItems: center` lines the pill up
      // with the glyphs instead of with a taller inherited line box.
      lineHeight: 1.15,
      color: muted,
    },
    badge: {
      backgroundColor: rule,
      borderRadius: px(2),
      paddingHorizontal: px(4),
      paddingTop: px(1),
      paddingBottom: px(2),
      marginLeft: px(3),
      lineHeight: 1.15,
      fontSize: px(8),
      // Ink (not muted) so the gray pill meets WCAG contrast on `--rule`.
      color: ink,
    },
    bulletList: {
      paddingLeft: spacing.bulletIndent,
    },
    bulletRow: {
      flexDirection: "row",
      marginBottom: px(2.5) * scale.bullet,
    },
    bulletMarker: {
      width: spacing.bulletIndent,
      marginLeft: -spacing.bulletIndent,
      fontFamily: "DM Sans SemiBold",
      fontSize: bodySizes.body ?? px(9.5),
      lineHeight: 1.5,
      color: blue,
    },
    bulletText: {
      flex: 1,
      fontSize: px(9.5),
      lineHeight: 1.5,
      color: ink,
    },
    tags: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: px(9) * scale.section,
    },
    tag: {
      backgroundColor: rule,
      borderRadius: px(3),
      padding: px(4) * scale.chip,
      marginRight: px(3) * scale.chip,
      marginBottom: px(3) * scale.chip,
      fontSize: bodySizes.tags ?? px(8.5),
      // react-pdf leaves extra leading below the baseline; 1.28 balances it
      // against the cap gap so the glyphs sit optically centred in the pill.
      lineHeight: 1.28,
      textAlign: "center",
      color: ink,
    },
    highlightedTag: {
      backgroundColor: blue,
      color: "#FFFFFF",
      fontFamily: "DM Sans Medium",
    },
    education: {
      fontSize: px(9.5),
      lineHeight: 1.6,
      color: ink,
    },
    educationDegree: {
      fontFamily: "DM Sans SemiBold",
    },
    educationMeta: {
      fontSize: px(8.5),
      lineHeight: 1.55,
      color: muted,
    },
    languageRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: px(6),
      marginBottom: px(2),
    },
    languageName: {
      fontSize: px(9.5),
      color: ink,
    },
    languageLevel: {
      fontFamily: "DM Sans Medium",
      fontSize: px(8.5),
      color: blue,
    },
    remoteNote: {
      fontSize: px(9),
      lineHeight: 1.6,
      color: muted,
    },
  });
}

export type ModernBlueStyles = ReturnType<typeof createModernBlueStyles>;
