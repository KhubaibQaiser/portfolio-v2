import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./card";
import { CardHeader } from "./card-header";
import { CardTitle } from "./card-title";
import { CardContent } from "./card-content";

const meta: Meta<typeof Card> = {
  title: "Primitives/Card",
  component: Card,
  argTypes: {
    hoverable: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
        <CardContent>
          This is the card content. It provides additional details about the
          topic.
        </CardContent>
      </>
    ),
  },
};

export const Hoverable: Story = {
  args: {
    hoverable: true,
    children: (
      <>
        <CardHeader>
          <CardTitle>Hoverable Card</CardTitle>
        </CardHeader>
        <CardContent>
          Hover over this card to see the accent border transition.
        </CardContent>
      </>
    ),
  },
};

export const Grid: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxWidth: "600px" }}>
      {["React", "TypeScript", "Next.js", "Tailwind"].map((title) => (
        <Card key={title} hoverable>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>Expert-level proficiency with {title}.</CardContent>
        </Card>
      ))}
    </div>
  ),
};
