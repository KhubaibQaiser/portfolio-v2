import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Select } from "./select";

const meta: Meta<typeof Select> = {
  title: "Primitives/Select",
  component: Select,
  argTypes: {
    variant: { control: "select", options: ["default", "muted"] },
    disabled: { control: "boolean" },
    error: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: (args) => (
    <div className="w-72">
      <Select {...args}>
        <option value="">Choose…</option>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>
    </div>
  ),
};

export const Muted: Story = {
  args: { variant: "muted" },
  render: (args) => (
    <div className="w-72">
      <Select {...args}>
        <option value="remote">Remote</option>
        <option value="onsite">On-site</option>
        <option value="hybrid">Hybrid</option>
      </Select>
    </div>
  ),
};

export const WithError: Story = {
  args: { error: "Please select a value", variant: "muted" },
  render: (args) => (
    <div className="w-72">
      <Select {...args}>
        <option value="">Choose…</option>
        <option value="x">Valid choice</option>
      </Select>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, variant: "muted" },
  render: (args) => (
    <div className="w-72">
      <Select {...args}>
        <option value="only">Only option</option>
      </Select>
    </div>
  ),
};
