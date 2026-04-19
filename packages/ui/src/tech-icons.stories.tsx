import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HERO_TOP_TECHS, type HeroTopTech } from "@portfolio/shared/constants";
import { AwsIcon } from "./icons/aws-icon";
import { VercelAiSdkIcon } from "./icons/vercel-ai-sdk-icon";
import { getHeroSimpleIcon } from "./hero-tech-icon-map";
import { cn } from "@portfolio/shared/utils";
import "./hero-tech-carousel.css";

const meta: Meta = {
  title: "Blocks/HeroTechIcons",
};

export default meta;

type Story = StoryObj;

function HeroTechIconPreview({ tech }: { tech: HeroTopTech }) {
  if (tech.iconKey === "AwsBrand") {
    return <AwsIcon width={28} height={28} accentColor="#FF9900" />;
  }
  if (tech.iconKey === "VercelAiSdkBrand") {
    return (
      <VercelAiSdkIcon
        width={28}
        height={28}
        color="currentColor"
        className="hero-tech-mono-brand"
      />
    );
  }
  const Icon = getHeroSimpleIcon(tech.iconKey);
  if (!Icon) {
    return <span className="text-destructive text-xs">?</span>;
  }
  const isMonoBrand =
    tech.id === "nextjs" || tech.id === "vercel" || tech.id === "ai-sdk";
  return (
    <Icon
      width={28}
      height={28}
      color={isMonoBrand ? "currentColor" : (tech.brandColor ?? undefined)}
      className={cn(isMonoBrand && "hero-tech-mono-brand")}
    />
  );
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
