import type { Meta, StoryObj } from "@storybook/react";
import { GitHubIcon } from "./github-icon";

const meta: Meta<typeof GitHubIcon> = {
  title: "Icons/GitHubIcon",
  component: GitHubIcon,
  args: { width: 24, height: 24 },
};

export default meta;
type Story = StoryObj<typeof GitHubIcon>;

export const Default: Story = {};

export const Large: Story = {
  args: { width: 48, height: 48 },
};
