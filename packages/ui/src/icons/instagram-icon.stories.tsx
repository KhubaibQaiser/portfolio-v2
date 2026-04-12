import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { InstagramIcon } from "./instagram-icon";

const meta: Meta<typeof InstagramIcon> = {
  title: "Icons/InstagramIcon",
  component: InstagramIcon,
  args: { width: 24, height: 24 },
};

export default meta;
type Story = StoryObj<typeof InstagramIcon>;

export const Default: Story = {};

export const Large: Story = {
  args: { width: 48, height: 48 },
};
