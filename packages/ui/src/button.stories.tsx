import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "ghost", "accent"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: "Button", variant: "default", size: "md" },
};

export const Accent: Story = {
  args: { children: "Get Started", variant: "accent", size: "md" },
};

export const Outline: Story = {
  args: { children: "Learn More", variant: "outline", size: "md" },
};

export const Ghost: Story = {
  args: { children: "Cancel", variant: "ghost", size: "md" },
};

export const Small: Story = {
  args: { children: "Small", variant: "default", size: "sm" },
};

export const Large: Story = {
  args: { children: "Large Action", variant: "accent", size: "lg" },
};

export const Disabled: Story = {
  args: { children: "Disabled", variant: "default", disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <Button variant="default">Default</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};
