import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  PageFitModeToggle,
  ReadingDirectionToggle,
  ViewModeToggle,
} from "./reader-settings";
import { useViewerContext, ViewerProvider } from "./viewer-context";
import type { PageFitMode, ReadingDirection, ViewMode } from "./viewer-context";

const pages = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
];

/**
 * Stands in for the viewport measurement `useViewMode` makes, which is what
 * tells the view-mode toggle whether a spread fits.
 */
const DoublePageAvailability = () => {
  const { setDoublePageAvailable } = useViewerContext();

  return (
    <button
      onClick={() => {
        setDoublePageAvailable(false);
      }}
      type="button"
    >
      Narrow the viewport
    </button>
  );
};

interface RenderSettingsOptions {
  initialPageFitMode?: PageFitMode;
  initialReadingDirection?: ReadingDirection;
  initialViewMode?: ViewMode;
}

const renderSettings = (
  children: React.ReactNode,
  {
    initialPageFitMode = "height",
    initialReadingDirection = "rtl",
    initialViewMode = "single",
  }: RenderSettingsOptions = {}
) =>
  render(
    <ViewerProvider
      pages={pages}
      initialPageFitMode={initialPageFitMode}
      initialReadingDirection={initialReadingDirection}
      initialViewMode={initialViewMode}
    >
      <DoublePageAvailability />
      {children}
    </ViewerProvider>
  );

const clickButton = (name: string): void => {
  fireEvent.click(screen.getByRole("button", { name }));
};

describe(ViewModeToggle, () => {
  it("reports the current mode through aria-pressed and a data attribute", () => {
    renderSettings(<ViewModeToggle />, { initialViewMode: "double" });

    const toggle = screen.getByRole("button", { name: "Double-page view" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("data-view-mode", "double");
    expect(toggle).toHaveTextContent("Double page");
  });

  it("switches between single and double page display", () => {
    renderSettings(<ViewModeToggle />);

    clickButton("Double-page view");

    expect(
      screen.getByRole("button", { name: "Double-page view" })
    ).toHaveAttribute("data-view-mode", "double");

    clickButton("Double-page view");

    expect(
      screen.getByRole("button", { name: "Double-page view" })
    ).toHaveAttribute("data-view-mode", "single");
  });

  it("is disabled while the viewport is too narrow for a spread", () => {
    renderSettings(<ViewModeToggle />);

    expect(
      screen.getByRole("button", { name: "Double-page view" })
    ).toBeEnabled();

    clickButton("Narrow the viewport");

    expect(
      screen.getByRole("button", { name: "Double-page view" })
    ).toBeDisabled();
  });

  it("stays disabled when the consumer disables it", () => {
    renderSettings(<ViewModeToggle disabled />);

    expect(
      screen.getByRole("button", { name: "Double-page view" })
    ).toBeDisabled();
  });

  it("leaves the mode alone when onClick prevents the default", () => {
    const onClick = vi.fn<(event: { preventDefault: () => void }) => void>(
      (event) => {
        event.preventDefault();
      }
    );
    renderSettings(<ViewModeToggle onClick={onClick} />);

    clickButton("Double-page view");

    expect(onClick).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Double-page view" })
    ).toHaveAttribute("data-view-mode", "single");
  });

  it("renders the children it is given in place of the default label", () => {
    renderSettings(<ViewModeToggle>Spread</ViewModeToggle>);

    expect(
      screen.getByRole("button", { name: "Double-page view" })
    ).toHaveTextContent("Spread");
  });
});

describe(ReadingDirectionToggle, () => {
  it("names the current direction and reports it as a data attribute", () => {
    renderSettings(<ReadingDirectionToggle />);

    const toggle = screen.getByRole("button", {
      name: "Reading direction: Right to left",
    });
    expect(toggle).toHaveAttribute("data-reading-direction", "rtl");
    expect(toggle).toHaveTextContent("Right to left");
  });

  it("switches between right-to-left and left-to-right reading", () => {
    renderSettings(<ReadingDirectionToggle />);

    clickButton("Reading direction: Right to left");

    const toggle = screen.getByRole("button", {
      name: "Reading direction: Left to right",
    });
    expect(toggle).toHaveAttribute("data-reading-direction", "ltr");

    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "Reading direction: Right to left" })
    ).toHaveAttribute("data-reading-direction", "rtl");
  });

  it("leaves the direction alone when onClick prevents the default", () => {
    renderSettings(
      <ReadingDirectionToggle
        onClick={(event) => {
          event.preventDefault();
        }}
      />
    );

    clickButton("Reading direction: Right to left");

    expect(
      screen.getByRole("button", { name: "Reading direction: Right to left" })
    ).toHaveAttribute("data-reading-direction", "rtl");
  });
});

describe(PageFitModeToggle, () => {
  it("cycles through the three fit modes without a mode prop", () => {
    renderSettings(<PageFitModeToggle />);

    expect(
      screen.getByRole("button", { name: "Page fit: Fit to height" })
    ).toHaveAttribute("data-page-fit-mode", "height");

    clickButton("Page fit: Fit to height");

    expect(
      screen.getByRole("button", { name: "Page fit: Fit to width" })
    ).toHaveAttribute("data-page-fit-mode", "width");

    clickButton("Page fit: Fit to width");

    expect(
      screen.getByRole("button", { name: "Page fit: Actual size" })
    ).toHaveAttribute("data-page-fit-mode", "actual");

    clickButton("Page fit: Actual size");

    expect(
      screen.getByRole("button", { name: "Page fit: Fit to height" })
    ).toBeInTheDocument();
  });

  it("selects the mode it names and reports whether it is the current one", () => {
    renderSettings(
      <>
        <PageFitModeToggle mode="height" />
        <PageFitModeToggle mode="width" />
        <PageFitModeToggle mode="actual" />
      </>
    );

    expect(
      screen.getByRole("button", { name: "Fit to height" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Fit to width" })
    ).toHaveAttribute("aria-pressed", "false");

    clickButton("Fit to width");

    expect(
      screen.getByRole("button", { name: "Fit to width" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Fit to height" })
    ).toHaveAttribute("aria-pressed", "false");

    // A button that names a mode sets that one however often it is pressed.
    clickButton("Fit to width");

    expect(
      screen.getByRole("button", { name: "Fit to width" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("leaves the mode alone when onClick prevents the default", () => {
    renderSettings(
      <PageFitModeToggle
        mode="width"
        onClick={(event) => {
          event.preventDefault();
        }}
      />
    );

    clickButton("Fit to width");

    expect(
      screen.getByRole("button", { name: "Fit to width" })
    ).toHaveAttribute("aria-pressed", "false");
  });
});
