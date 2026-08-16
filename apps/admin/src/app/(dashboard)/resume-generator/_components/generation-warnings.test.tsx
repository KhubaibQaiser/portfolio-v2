// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GenerationWarnings } from "./generation-warnings";

afterEach(cleanup);

describe("GenerationWarnings", () => {
  it("renders nothing when generation has no review notes", () => {
    const { container } = render(<GenerationWarnings warnings={[]} />);

    expect(container.innerHTML).toBe("");
  });

  it("renders every generation warning as a review note", () => {
    render(
      <GenerationWarnings
        warnings={[
          "Wording may read as AI-generated.",
          "PDF export will validate the final fit.",
        ]}
      />,
    );

    expect(screen.getByRole("status").textContent).toContain("Review notes");
    expect(screen.getByText("Wording may read as AI-generated.")).toBeTruthy();
    expect(screen.getByText("PDF export will validate the final fit.")).toBeTruthy();
  });
});
