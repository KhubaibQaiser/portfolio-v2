import { Text, View } from "@react-pdf/renderer";
import type { ResumeDataSkillGroup } from "@portfolio/shared/resume-data";
import type { ModernBlueStyles } from "./modern-blue-print-spec";
import { ModernBlueSectionHeading } from "./modern-blue-section-heading";

type Props = {
  group: ResumeDataSkillGroup;
  highlighted: boolean;
  styles: ModernBlueStyles;
};

export function ModernBlueSkillTags({ group, highlighted, styles }: Props) {
  return (
    <View wrap={false}>
      <ModernBlueSectionHeading styles={styles}>
        {group.category}
      </ModernBlueSectionHeading>
      <View style={styles.tags}>
        {group.items.map((item, index) => (
          <Text
            key={item}
            style={[styles.tag, highlighted && index < 10 ? styles.highlightedTag : {}]}
          >
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}
