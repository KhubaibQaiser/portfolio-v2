import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Info } from "lucide-react";
import { Tooltip } from "./tooltip";
import { Button } from "./button";

const meta: Meta<typeof Tooltip> = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  args: {
    content: "Helpful context",
    side: "top",
    delayMs: 120,
  },
  argTypes: {
    content: { control: "text" },
    side: { control: "select", options: ["top", "bottom"] },
    offset: { control: "number" },
    delayMs: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Basic: Story = {
  render: (args) => (
    <div className="flex justify-center p-20">
      <Tooltip {...args}>
        <Button variant="outline">Hover me</Button>
      </Tooltip>
    </div>
  ),
};

export const IconTrigger: Story = {
  args: {
    content: "Portfolio metrics are updated weekly",
  },
  render: (args) => (
    <div className="flex justify-center p-20">
      <Tooltip {...args}>
        <button
          type="button"
          className="border-border text-foreground inline-flex h-10 w-10 items-center justify-center rounded-full border bg-transparent"
        >
          <Info size={18} />
        </button>
      </Tooltip>
    </div>
  ),
};
