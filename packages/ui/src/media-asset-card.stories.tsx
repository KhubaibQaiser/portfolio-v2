import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { MediaAssetCard } from "./media-asset-card";

const SAMPLE_URL = "https://picsum.photos/seed/portfolio-media/640/360";

const meta: Meta<typeof MediaAssetCard> = {
  title: "Admin/MediaAssetCard",
  component: MediaAssetCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Card layout for a single media asset: preview, metadata, copy URL, and delete. Used in the admin media library grid.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MediaAssetCard>;

export const Default: Story = {
  render: function Render() {
    const [copied, setCopied] = useState(false);
    return (
      <div style={{ maxWidth: 320 }}>
        <MediaAssetCard
          filename="hero-background.webp"
          imageUrl={SAMPLE_URL}
          sizeLabel="420 KB"
          uploadedLabel="3 days ago"
          copied={copied}
          onCopyUrl={() => setCopied(true)}
          onDelete={() => {}}
        />
      </div>
    );
  },
};

export const Copied: Story = {
  args: {
    filename: "logo.png",
    imageUrl: SAMPLE_URL,
    sizeLabel: "12 KB",
    uploadedLabel: "1 week ago",
    copied: true,
    onCopyUrl: () => {},
    onDelete: () => {},
  },
};

export const Grid: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 16,
        maxWidth: 720,
      }}
    >
      {["a", "b", "c"].map((seed) => (
        <MediaAssetCard
          key={seed}
          filename={`asset-${seed}.jpg`}
          imageUrl={`https://picsum.photos/seed/${seed}m/640/360`}
          sizeLabel="128 KB"
          uploadedLabel="Today"
          onCopyUrl={() => {}}
          onDelete={() => {}}
        />
      ))}
    </div>
  ),
};
