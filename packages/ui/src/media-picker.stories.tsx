import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import type { Media } from "@portfolio/shared/schemas";
import { MediaPicker } from "./media-picker";

const tones = [
  "1e293b",
  "0f766e",
  "7c2d12",
  "4c1d95",
  "9f1239",
  "1d4ed8",
  "166534",
  "854d0e",
];

const items: Media[] = tones.map((tone, i) => ({
  id: `m${i}`,
  filename: `screenshot-${i + 1}.png`,
  url: `https://placehold.co/600x600/${tone}/f8fafc/png?text=${i + 1}`,
  mime_type: "image/png",
  size: 1024,
  alt_text: null,
  uploaded_at: "2026-11-13T00:00:00.000Z",
}));

const meta: Meta<typeof MediaPicker> = {
  title: "Admin/MediaPicker",
  component: MediaPicker,
  args: { items, onConfirm: () => {}, onClose: () => {} },
};

export default meta;
type Story = StoryObj<typeof MediaPicker>;

export const Multiple: Story = {
  args: { multiple: true, title: "Add gallery images", disabledUrls: [items[0]!.url] },
};
export const Single: Story = { args: { title: "Choose cover image" } };
export const WithUpload: Story = {
  args: { multiple: true, onUpload: async () => null },
};
export const Empty: Story = { args: { items: [], onUpload: async () => null } };
