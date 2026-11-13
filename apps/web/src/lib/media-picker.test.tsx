// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Media } from "@portfolio/shared/schemas";
import { GalleryEditor } from "@portfolio/ui/gallery-editor";
import { MediaPicker } from "@portfolio/ui/media-picker";

afterEach(cleanup);

const media = (id: string, alt: string | null = null): Media => ({
  id,
  filename: `${id}.png`,
  url: `https://media.example.com/${id}.png`,
  mime_type: "image/png",
  size: 1,
  alt_text: alt,
  uploaded_at: "2026-11-13T00:00:00.000Z",
});

describe("MediaPicker", () => {
  it("returns the chosen images in multi-select mode", () => {
    const onConfirm = vi.fn();
    render(
      <MediaPicker
        multiple
        items={[media("a"), media("b"), media("c")]}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    expect(
      (screen.getByRole("button", { name: "Add images" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "a.png" }));
    fireEvent.click(screen.getByRole("button", { name: "c.png" }));
    fireEvent.click(screen.getByRole("button", { name: "Add 2 images" }));

    expect(onConfirm).toHaveBeenCalledWith([media("a"), media("c")]);
  });

  it("selects exactly one image in single mode and prefers alt text as the label", () => {
    const onConfirm = vi.fn();
    render(
      <MediaPicker
        items={[media("a", "Dashboard"), media("b")]}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: "b.png" }));
    fireEvent.click(screen.getByRole("button", { name: "Use image" }));

    expect(onConfirm).toHaveBeenCalledWith([media("b")]);
  });

  it("disables images already in use and closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <MediaPicker
        multiple
        items={[media("a"), media("b")]}
        disabledUrls={[media("a").url]}
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(
      (screen.getByRole("button", { name: "a.png" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("adds an uploaded image to the grid and selects it", async () => {
    const onUpload = vi.fn(async () => media("new"));
    const { container } = render(
      <MediaPicker
        items={[]}
        onUpload={onUpload}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "new.png", { type: "image/png" })] },
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "new.png" })).toBeTruthy(),
    );
    expect(
      screen.getByRole("button", { name: "new.png" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });
});

describe("GalleryEditor", () => {
  const images = [
    { url: "https://media.example.com/a.png", alt: "A" },
    { url: "https://media.example.com/b.png", alt: "B" },
  ];

  it("reorders, edits alt text and removes images", () => {
    const onChange = vi.fn();
    render(<GalleryEditor images={images} onChange={onChange} onAdd={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Move image 1 down" }));
    expect(onChange).toHaveBeenLastCalledWith([images[1], images[0]]);

    fireEvent.change(screen.getByLabelText("Alt text for image 2"), {
      target: { value: "Second" },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      images[0],
      { ...images[1], alt: "Second" },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Remove image 1" }));
    expect(onChange).toHaveBeenLastCalledWith([images[1]]);
  });

  it("disables the edge moves and the add button at the limit", () => {
    render(<GalleryEditor images={images} max={2} onChange={vi.fn()} onAdd={vi.fn()} />);

    expect(
      (screen.getByRole("button", { name: "Move image 1 up" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Move image 2 down" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /Add images/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText("2/2")).toBeTruthy();
  });
});
