import type { Meta, StoryObj } from "@storybook/react";
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
    <div style={{ padding: "80px", display: "flex", justifyContent: "center" }}>
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
    <div style={{ padding: "80px", display: "flex", justifyContent: "center" }}>
      <Tooltip {...args}>
        <button
          type="button"
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            border: "1px solid var(--color-border)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            color: "var(--color-foreground)",
          }}
        >
          <Info size={18} />
        </button>
      </Tooltip>
    </div>
  ),
};
