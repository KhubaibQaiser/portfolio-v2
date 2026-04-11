import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "Primitives/Input",
  component: Input,
  argTypes: {
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    error: { control: "text" },
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "url"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Enter your name..." },
};

export const WithError: Story = {
  args: { placeholder: "Email", error: "Please enter a valid email address" },
};

export const Disabled: Story = {
  args: { placeholder: "Disabled input", disabled: true },
};

export const Password: Story = {
  args: { placeholder: "Enter password", type: "password" },
};
