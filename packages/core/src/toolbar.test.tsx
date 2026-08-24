import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PageNavigation } from "./page-navigation";
import { Toolbar } from "./toolbar";
import { useViewerContext, ViewerProvider } from "./viewer-context";

const pages = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
  { id: "p3", src: "page3.png", title: "Page 3" },
];

/** Stands in for the viewport tap that reveals the shared reader controls. */
const ControlsToggle = () => {
  const { toggleControls } = useViewerContext();

  return (
    <button onClick={toggleControls} type="button">
      Toggle controls
    </button>
  );
};

const toggleControls = (): void => {
  fireEvent.click(screen.getByRole("button", { name: "Toggle controls" }));
};

/** Hidden controls carry no accessible name, so the class is the only handle. */
const getByClassName = (container: HTMLElement, name: string): HTMLElement => {
  const element = container.querySelector<HTMLElement>(`.${name}`);

  if (element === null) {
    throw new Error(`No element with the ${name} class was rendered.`);
  }

  return element;
};

const getToolbar = (container: HTMLElement): HTMLElement =>
  getByClassName(container, "pcv-toolbar");

describe(Toolbar, () => {
  it("renders the reading progress by default", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialIndex={1}>
        <ControlsToggle />
        <Toolbar />
      </ViewerProvider>
    );
    toggleControls();

    const progress = screen.getByRole("progressbar", {
      name: "Reading progress",
    });

    expect(getToolbar(container)).toContainElement(progress);
    expect(progress).toHaveAttribute("max", "3");
    expect(progress).toHaveAttribute("value", "2");
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("keeps consumer-supplied children instead of the default progress", () => {
    render(
      <ViewerProvider pages={pages}>
        <ControlsToggle />
        <Toolbar>
          <span data-testid="custom">controls</span>
        </Toolbar>
      </ViewerProvider>
    );
    toggleControls();

    expect(screen.getByTestId("custom")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("reveals and hides its controls together with PageNavigation", () => {
    vi.useFakeTimers();

    try {
      const { container } = render(
        <ViewerProvider pages={pages}>
          <ControlsToggle />
          <Toolbar />
          <PageNavigation />
        </ViewerProvider>
      );
      const controls = [
        getToolbar(container),
        getByClassName(container, "pcv-page-navigation"),
      ];
      const expectHidden = (hidden: boolean): void => {
        for (const control of controls) {
          expect(control).toHaveAttribute("aria-hidden", String(hidden));
        }
      };

      expectHidden(true);

      toggleControls();
      expectHidden(false);

      act(() => vi.advanceTimersByTime(2000));
      expectHidden(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides its controls immediately when they are toggled again", () => {
    vi.useFakeTimers();

    try {
      const { container } = render(
        <ViewerProvider pages={pages}>
          <ControlsToggle />
          <Toolbar />
        </ViewerProvider>
      );
      const toolbar = getToolbar(container);

      toggleControls();
      expect(toolbar).toHaveAttribute("aria-hidden", "false");

      toggleControls();
      expect(toolbar).toHaveAttribute("aria-hidden", "true");

      act(() => vi.advanceTimersByTime(2000));
      expect(toolbar).toHaveAttribute("aria-hidden", "true");
    } finally {
      vi.useRealTimers();
    }
  });

  it("applies a consumer class name alongside the base class", () => {
    const { container } = render(
      <ViewerProvider pages={pages}>
        <Toolbar className="reader-toolbar" />
      </ViewerProvider>
    );

    expect(getToolbar(container)).toHaveClass("pcv-toolbar", "reader-toolbar");
  });
});
