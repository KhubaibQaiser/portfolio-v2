import type { Meta, StoryObj } from "@storybook/react";
import { HeroTechCarousel } from "./hero-tech-carousel";

const meta: Meta<typeof HeroTechCarousel> = {
  title: "Blocks/HeroTechCarousel",
  component: HeroTechCarousel,
};

export default meta;
type Story = StoryObj<typeof HeroTechCarousel>;

export const Default: Story = {
  render: () => (
    <div className="bg-background p-8">
      <HeroTechCarousel />
    </div>
  ),
};
