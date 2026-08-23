import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PageFitModeControls } from "./page-fit-mode";
import { ViewerProvider } from "./viewer-context";

const pages = [{ id: "p1", src: "page1.png", title: "Page 1" }];

describe(PageFitModeControls, () => {
  it("provides keyboard-accessible controls with the selected mode exposed", async () => {
    const user = userEvent.setup();
    render(
      <ViewerProvider pages={pages}>
        <PageFitModeControls />
      </ViewerProvider>
    );

    const fitHeight = screen.getByRole("button", {
      name: "Fit page to height",
    });
    const actualSize = screen.getByRole("button", {
      name: "Show page at actual size",
    });

    expect(fitHeight).toHaveAttribute("aria-pressed", "true");
    actualSize.focus();
    await user.keyboard("{Enter}");

    expect(actualSize).toHaveAttribute("aria-pressed", "true");
    expect(fitHeight).toHaveAttribute("aria-pressed", "false");
  });
});
