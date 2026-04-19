import type { ComponentType, SVGProps } from "react";
import {
  SiDocker,
  SiFirebase,
  SiGithubactions,
  SiGraphql,
  SiNextdotjs,
  SiNodedotjs,
  SiPosthog,
  SiReact,
  SiRedux,
  SiTailwindcss,
  SiTanstack,
  SiTypescript,
  SiVercel,
} from "@icons-pack/react-simple-icons";

export type HeroSimpleIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Simple Icons used by the hero tech carousel (curated in shared constants). */
export const HERO_SIMPLE_ICON_MAP: Record<string, HeroSimpleIconComponent> = {
  SiReact,
  SiNextdotjs,
  SiTypescript,
  SiNodedotjs,
  SiGraphql,
  SiRedux,
  SiTanstack,
  SiDocker,
  SiFirebase,
  SiTailwindcss,
  SiPosthog,
  SiVercel,
  SiGithubactions,
};

export function getHeroSimpleIcon(iconKey: string): HeroSimpleIconComponent | null {
  return HERO_SIMPLE_ICON_MAP[iconKey] ?? null;
}
