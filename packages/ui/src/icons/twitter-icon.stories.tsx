import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { TwitterIcon } from "./twitter-icon";

const meta: Meta<typeof TwitterIcon> = {
  title: "Icons/TwitterIcon",
  component: TwitterIcon,
  args: { width: 24, height: 24 },
};

export default meta;
type Story = StoryObj<typeof TwitterIcon>;

export const Default: Story = {};

export const Large: Story = {
  args: { width: 48, height: 48 },
};
