import type { Meta, StoryObj } from "@storybook/react";
import { ParallaxDivider } from "./parallax-divider";

const meta: Meta<typeof ParallaxDivider> = {
  title: "Components/ParallaxDivider",
  component: ParallaxDivider,
  argTypes: {
    variant: {
      control: "select",
      options: ["gradient", "subtle", "accent"],
    },
  },
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof ParallaxDivider>;

export const WithStat: Story = {
  args: {
    stat: "5+",
    label: "Years of Experience",
    variant: "gradient",
  },
};

export const WithQuote: Story = {
  args: {
    quote: "The best way to predict the future is to create it.",
    variant: "subtle",
  },
};

export const AccentVariant: Story = {
  args: {
    stat: "50+",
    label: "Projects Delivered",
    variant: "accent",
  },
};
