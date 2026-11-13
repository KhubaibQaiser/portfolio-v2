import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./carousel";

const tones = ["bg-sky-500/20", "bg-emerald-500/20", "bg-amber-500/20"];

function Demo({ slides }: { slides: number }) {
  return (
    <Carousel aria-label="Example slides">
      <CarouselContent className="aspect-video rounded-2xl">
        {tones.slice(0, slides).map((tone, i) => (
          <CarouselItem
            key={tone}
            className={`flex items-center justify-center text-3xl font-semibold ${tone}`}
          >
            Slide {i + 1}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
      <CarouselDots />
    </Carousel>
  );
}

const meta: Meta<typeof Demo> = {
  title: "Primitives/Carousel",
  component: Demo,
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const Default: Story = { args: { slides: 3 } };
export const SingleSlide: Story = { args: { slides: 1 } };
