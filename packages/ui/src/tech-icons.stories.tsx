import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HERO_TOP_TECHS, type HeroTopTech } from "@portfolio/shared/constants";
import { AwsIcon } from "./icons/aws-icon";
import { getHeroSimpleIcon } from "./hero-tech-icon-map";

const meta: Meta = {
  title: "Blocks/HeroTechIcons",
};

export default meta;

type Story = StoryObj;

function HeroTechIconPreview({ tech }: { tech: HeroTopTech }) {
  if (tech.iconKey === "AwsBrand") {
    return <AwsIcon width={28} height={28} accentColor="#FF9900" />;
  }
  const Icon = getHeroSimpleIcon(tech.iconKey);
  if (!Icon) {
    return <span className="text-destructive text-xs">?</span>;
  }
  return <Icon width={28} height={28} color={tech.brandColor ?? undefined} />;
}

export const Gallery: Story = {
  render: () => (
    <div className="bg-background p-8">
      <ul className="flex flex-wrap gap-6">
        {HERO_TOP_TECHS.map((tech) => (
          <li
            key={tech.id}
            className="border-border/60 flex flex-col items-center gap-2 rounded-lg border px-4 py-3"
          >
            <span className="text-muted-foreground text-xs">{tech.label}</span>
            <div className="text-muted-foreground flex h-12 w-12 items-center justify-center">
              <HeroTechIconPreview tech={tech} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  ),
};
