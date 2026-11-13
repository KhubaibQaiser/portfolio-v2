// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@portfolio/ui/carousel";

const scrollTo = vi.fn();

beforeEach(() => {
  scrollTo.mockClear();
  Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    value: 400,
  });
});
afterEach(cleanup);

function renderCarousel(items: string[]) {
  return render(
    <Carousel aria-label="Shots">
      <CarouselContent>
        {items.map((t) => (
          <CarouselItem key={t}>{t}</CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
      <CarouselDots />
    </Carousel>,
  );
}

const prev = () =>
  screen.getByRole("button", { name: "Previous slide" }) as HTMLButtonElement;

describe("Carousel", () => {
  it("exposes a labelled carousel region with one dot per slide, first current", () => {
    renderCarousel(["One", "Two", "Three"]);

    expect(screen.getByRole("region", { name: "Shots" })).toBeTruthy();
    const dots = screen.getAllByRole("button", { name: /Go to slide/ });
    expect(dots).toHaveLength(3);
    expect(dots[0]!.getAttribute("aria-current")).toBe("true");
    expect(dots[1]!.getAttribute("aria-current")).toBeNull();
  });

  it("scrolls to the slide when a dot or the next arrow is clicked", () => {
    renderCarousel(["One", "Two", "Three"]);

    fireEvent.click(screen.getByRole("button", { name: "Go to slide 3" }));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 800 }));

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 400 }));
  });

  it("updates the active dot when the track scrolls", () => {
    renderCarousel(["One", "Two", "Three"]);
    const track = screen.getAllByRole("group")[0]!.parentElement!;

    track.scrollLeft = 400;
    fireEvent.scroll(track);

    expect(
      screen.getByRole("button", { name: "Go to slide 2" }).getAttribute("aria-current"),
    ).toBe("true");
    expect(prev().disabled).toBe(false);
  });

  it("supports arrow keys and disables Previous on the first slide", () => {
    renderCarousel(["One", "Two", "Three"]);

    expect(prev().disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowRight" });
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 400 }));
  });

  it("shows no controls for a single slide", () => {
    renderCarousel(["Only"]);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("merges className and spreads props onto its parts", () => {
    render(
      <Carousel aria-label="Shots" className="custom-root">
        <CarouselContent className="custom-content" data-testid="content">
          <CarouselItem className="custom-item">A</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    expect(screen.getByRole("region").className).toContain("custom-root");
    expect(screen.getByTestId("content").className).toContain("custom-content");
    expect(screen.getByRole("group").className).toContain("custom-item");
  });
});
