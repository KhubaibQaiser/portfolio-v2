// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumePdfDownloadLink } from "@/components/analytics/resume-analytics";
import { capturePortfolioEvent } from "@/lib/analytics/capture-client";

vi.mock("@/lib/analytics/capture-client", () => ({
  capturePortfolioEvent: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ResumePdfDownloadLink", () => {
  it("disables duplicate downloads while the PDF is pending", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn(() => responsePromise);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:resume"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(
      <ResumePdfDownloadLink className="download">Download PDF</ResumePdfDownloadLink>,
    );
    const button = screen.getByRole("button", { name: "Download PDF" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole("button", { name: "Preparing PDF…" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    resolveResponse?.({
      ok: true,
      blob: async () => new Blob(["pdf"]),
      headers: new Headers({
        "Content-Disposition": 'attachment; filename="resume.pdf"',
      }),
    } as Response);
    await waitFor(() =>
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false),
    );
    expect(capturePortfolioEvent).toHaveBeenCalledTimes(1);
  });

  it("surfaces a rate-limit response without recording a download", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "Too many PDF requests. Please try again shortly." },
            { status: 429 },
          ),
        ),
    );

    render(
      <ResumePdfDownloadLink className="download">Download PDF</ResumePdfDownloadLink>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Too many PDF requests. Please try again shortly.");
    expect(capturePortfolioEvent).not.toHaveBeenCalled();
  });
});
