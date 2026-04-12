import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "Primitives/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "accent", "outline", "success"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: "React", variant: "default" },
};

export const Accent: Story = {
  args: { children: "TypeScript", variant: "accent" },
};

export const Outline: Story = {
  args: { children: "Next.js", variant: "outline" },
};

export const Success: Story = {
  args: { children: "Available", variant: "success" },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <Badge variant="default">React</Badge>
      <Badge variant="accent">TypeScript</Badge>
      <Badge variant="outline">Next.js</Badge>
      <Badge variant="success">Available</Badge>
    </div>
  ),
};
