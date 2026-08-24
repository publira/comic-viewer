import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useViewportZoom } from "./use-viewport-zoom";
import { ViewerProvider } from "./viewer-context";
import { Viewport } from "./viewport";
import {
  CurrentIndexIndicator,
  MockResizeObserver,
  pages,
  setViewportRect,
} from "./viewport-test-helpers";

describe(useViewportZoom, () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    MockResizeObserver.callback = null;
  });

  it("pans an actual-size page with a pointer and keeps it within its bounds", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialPageFitMode="actual">
        <Viewport />
      </ViewerProvider>
    );
    const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");
    const pageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (viewport === null || pageSet === null) {
      throw new Error("The current page set was not rendered.");
    }

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      clientWidth: { configurable: true, value: 100 },
    });
    Object.defineProperties(pageSet, {
      scrollHeight: { configurable: true, value: 400 },
      scrollWidth: { configurable: true, value: 300 },
    });

    fireEvent.pointerDown(viewport, {
      button: 0,
      clientX: 100,
      clientY: 100,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(viewport, {
      clientX: -100,
      clientY: -300,
      pointerId: 1,
    });

    expect(viewport).toHaveAttribute("data-panning", "true");
    expect(pageSet).toHaveStyle("--pcv-pan-x: -100px");
    expect(pageSet).toHaveStyle("--pcv-pan-y: -150px");

    fireEvent.pointerUp(viewport, { pointerId: 1 });
    expect(viewport).not.toHaveAttribute("data-panning");
  });

  it("pans instead of turning pages on a touch gesture in a zoomed mode", () => {
    const { container } = render(
      <ViewerProvider
        pages={pages}
        initialIndex={1}
        initialPageFitMode="actual"
      >
        <Viewport />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");
    const pageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (viewport === null || pageSet === null) {
      throw new Error("The current page set was not rendered.");
    }

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      clientWidth: { configurable: true, value: 100 },
    });
    Object.defineProperties(pageSet, {
      scrollHeight: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 300 },
    });

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200, clientY: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 100, clientY: 120 }],
    });
    fireEvent.touchEnd(viewport);

    expect(pageSet).toHaveStyle("--pcv-pan-x: -100px");
    expect(pageSet).toHaveStyle("--pcv-pan-y: -80px");
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("zooms and pans with two touches without turning the page", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialIndex={1}>
        <Viewport />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");
    const pageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (viewport === null || pageSet === null) {
      throw new Error("The current page set was not rendered.");
    }

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      clientWidth: { configurable: true, value: 100 },
    });
    Object.defineProperties(pageSet, {
      scrollHeight: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 100 },
    });

    fireEvent.touchStart(viewport, {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ],
    });
    fireEvent.touchMove(viewport, {
      touches: [
        { clientX: 70, clientY: 100 },
        { clientX: 270, clientY: 100 },
      ],
    });

    expect(viewport).toHaveAttribute("data-panning", "true");
    expect(pageSet).toHaveStyle("--pcv-zoom-scale: 2");
    expect(pageSet).toHaveStyle("--pcv-pan-x: 20px");
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");

    fireEvent.touchEnd(viewport, {
      changedTouches: [{ clientX: 70, clientY: 100 }],
      touches: [{ clientX: 270, clientY: 100 }],
    });
    expect(viewport).not.toHaveAttribute("data-panning");
  });

  it("returns to fit-to-width on a single-finger double tap", () => {
    const { container } = render(
      <ViewerProvider
        pages={pages}
        initialIndex={1}
        initialPageFitMode="actual"
      >
        <Viewport />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");
    const pageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (viewport === null || pageSet === null) {
      throw new Error("The current page set was not rendered.");
    }

    const tap = () => {
      fireEvent.touchStart(viewport, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchEnd(viewport, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
        touches: [],
      });
    };

    tap();
    tap();

    expect(viewport).toHaveAttribute("data-page-fit-mode", "width");
    expect(pageSet).toHaveStyle("--pcv-zoom-scale: 1");

    setViewportRect(viewport);
    fireEvent.click(viewport, { clientX: 95 });
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");
  });
});
