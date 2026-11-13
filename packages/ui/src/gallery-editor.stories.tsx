import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { GalleryEditor, type GalleryImage } from "./gallery-editor";

const sample: GalleryImage[] = [
  { url: "https://placehold.co/160x112/0f766e/f8fafc/png?text=1", alt: "Dashboard view" },
  {
    url: "https://placehold.co/160x112/7c2d12/f8fafc/png?text=2",
    alt: "Embedded report",
  },
  { url: "https://placehold.co/160x112/4c1d95/f8fafc/png?text=3", alt: "" },
];

function Demo({ initial }: { initial: GalleryImage[] }) {
  const [images, setImages] = useState(initial);
  return (
    <div className="max-w-xl">
      <GalleryEditor
        images={images}
        onChange={setImages}
        onAdd={() =>
          setImages((prev) => [
            ...prev,
            {
              url: `https://placehold.co/160x112/1e293b/f8fafc/png?text=${prev.length + 1}`,
              alt: "",
            },
          ])
        }
      />
    </div>
  );
}

const meta: Meta<typeof Demo> = { title: "Admin/GalleryEditor", component: Demo };
export default meta;
type Story = StoryObj<typeof Demo>;

export const WithImages: Story = { args: { initial: sample } };
export const Empty: Story = { args: { initial: [] } };
