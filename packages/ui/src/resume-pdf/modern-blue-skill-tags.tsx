import { Text, View } from "@react-pdf/renderer";
import type { ResumeDataSkillGroup } from "@portfolio/shared/resume-data";
import type { ModernBlueStyles } from "./modern-blue-print-spec";
import { ModernBlueSectionHeading } from "./modern-blue-section-heading";

type Props = {
  group: ResumeDataSkillGroup;
  highlightedSkills: ReadonlySet<string>;
  styles: ModernBlueStyles;
};

export function ModernBlueSkillTags({ group, highlightedSkills, styles }: Props) {
  return (
    <View wrap={false}>
      <ModernBlueSectionHeading styles={styles}>
        {group.category}
      </ModernBlueSectionHeading>
      <View style={styles.tags}>
        {group.items.map((item) => (
          <Text
            key={item}
            style={[
              styles.tag,
              highlightedSkills.has(item.trim().toLocaleLowerCase())
                ? styles.highlightedTag
                : {},
            ]}
          >
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}
