import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { MediaDropzone } from "./media-dropzone";

const meta: Meta<typeof MediaDropzone> = {
  title: "Admin/MediaDropzone",
  component: MediaDropzone,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Drag-and-drop and file-picker region for image uploads. Validates MIME types and max size before calling `onFilesSelected`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MediaDropzone>;

export const Default: Story = {
  render: function Render() {
    const [last, setLast] = useState<string>("");
    return (
      <div style={{ maxWidth: 560 }}>
        <MediaDropzone
          onFilesSelected={(files) => {
            setLast(files.map((f) => `${f.name} (${f.type})`).join(", "));
          }}
        />
        {last ? (
          <p style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }} data-testid="last-files">
            Selected: {last}
          </p>
        ) : null}
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    onFilesSelected: () => {},
  },
};
