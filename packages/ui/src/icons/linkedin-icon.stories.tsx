import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { LinkedInIcon } from "./linkedin-icon";

const meta: Meta<typeof LinkedInIcon> = {
  title: "Icons/LinkedInIcon",
  component: LinkedInIcon,
  args: { width: 24, height: 24 },
};

export default meta;
type Story = StoryObj<typeof LinkedInIcon>;

export const Default: Story = {};

export const Large: Story = {
  args: { width: 48, height: 48 },
};
