import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePageTurn } from "./use-page-turn";
import { ViewerProvider } from "./viewer-context";
import { Viewport } from "./viewport";
import type { MockFetch } from "./viewport-test-helpers";
import {
  CurrentIndexIndicator,
  MockResizeObserver,
  mockPageImages,
  pages,
} from "./viewport-test-helpers";

describe(usePageTurn, () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    MockResizeObserver.callback = null;
  });

  it("waits for the incoming page image before starting a slide", async () => {
    // eslint-disable-next-line promise/avoid-new -- The unresolved promise models an in-flight image request.
    const pendingResponse = new Promise<unknown>(() => {});
    const { restore } = mockPageImages({
      fetch: (url) =>
        url === "page1.png"
          ? Promise.resolve({
              arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
              ok: true,
            })
          : pendingResponse,
    });

    try {
      const { container } = render(
        <ViewerProvider pages={pages} initialReadingDirection="ltr">
          <Viewport />
        </ViewerProvider>
      );
      const viewport = container.querySelector(".pcv-viewport");

      expect(viewport).not.toBeNull();
      if (viewport === null) {
        return;
      }

      await waitFor(() => {
        expect(screen.getByLabelText("Page 1")).not.toHaveAttribute(
          "aria-busy"
        );
      });

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(viewport).toHaveAttribute("data-transition-state", "waiting");
      expect(screen.getByLabelText("Page 2")).toHaveAttribute(
        "aria-busy",
        "true"
      );
    } finally {
      restore();
    }
  });

  it("does not remain waiting when the incoming page image fails", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn<MockFetch>().mockRejectedValue(new Error("Image unavailable"))
    );

    try {
      const { container } = render(
        <ViewerProvider pages={pages} initialReadingDirection="ltr">
          <Viewport />
        </ViewerProvider>
      );
      const viewport = container.querySelector(".pcv-viewport");

      if (viewport === null) {
        throw new Error("The viewport was not rendered.");
      }

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(viewport).toHaveAttribute("data-transition-state", "waiting");

      act(() => {
        vi.advanceTimersByTime(1200);
      });

      expect(viewport).not.toHaveAttribute("data-transition-state", "waiting");
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it("renders four pcv-page elements while double-page spreads slide", async () => {
    const { restore } = mockPageImages();

    try {
      const { container } = render(
        <ViewerProvider pages={pages} initialReadingDirection="ltr">
          <Viewport />
        </ViewerProvider>
      );

      act(() => {
        MockResizeObserver.trigger(1024);
      });
      await waitFor(() => {
        expect(container.querySelectorAll("canvas")).toHaveLength(4);
      });

      fireEvent.keyDown(window, { key: "ArrowRight" });

      await waitFor(() => {
        expect(
          container.querySelectorAll(
            '[data-rail-slot="current"] .pcv-page, [data-rail-slot="next"] .pcv-page'
          )
        ).toHaveLength(4);
        expect(
          container.querySelector('[data-rail-slot="current"]')
        ).toHaveAttribute("data-page-count", "2");
      });
    } finally {
      restore();
    }
  });

  it("skips the slide when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    try {
      const { container } = render(
        <ViewerProvider pages={pages} initialReadingDirection="ltr">
          <Viewport />
        </ViewerProvider>
      );
      const viewport = container.querySelector(".pcv-viewport");

      expect(viewport).not.toBeNull();
      if (viewport === null) {
        return;
      }

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(viewport).toHaveAttribute("data-transition-state", "idle");
      expect(viewport).not.toHaveAttribute("data-slide-direction");
      expect(
        viewport.querySelector('[data-rail-slot="current"]')
      ).toContainElement(screen.getByLabelText("Page 2"));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    ["LTR", "ltr", -80, 1],
    ["RTL", "rtl", 80, 1],
  ] as const)(
    "continues a qualifying %s swipe from its drag offset into the page turn",
    (label, initialReadingDirection, movement, expectedIndex) => {
      vi.useFakeTimers();
      const animationFrames: FrameRequestCallback[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn<MockFetch>().mockRejectedValue(new Error("Image unavailable."))
      );
      vi.stubGlobal(
        "requestAnimationFrame",
        // oxlint-disable-next-line promise/prefer-await-to-callbacks -- The test deliberately captures animation-frame callbacks for manual execution.
        vi.fn((callback: FrameRequestCallback) => {
          animationFrames.push(callback);
          return animationFrames.length;
        })
      );
      vi.stubGlobal("cancelAnimationFrame", vi.fn());

      try {
        const { container } = render(
          <ViewerProvider
            pages={pages}
            initialReadingDirection={initialReadingDirection}
            initialViewMode="single"
          >
            <Viewport />
            <CurrentIndexIndicator />
          </ViewerProvider>
        );
        const viewport = container.querySelector(".pcv-viewport");
        const track = container.querySelector(".pcv-viewport-track");

        if (viewport === null || track === null) {
          throw new Error(`${label} viewport rail was not rendered.`);
        }

        fireEvent.touchStart(viewport, {
          touches: [{ clientX: 200 }],
        });
        fireEvent.touchMove(viewport, {
          touches: [{ clientX: 200 + movement }],
        });
        fireEvent.touchEnd(viewport, {
          changedTouches: [{ clientX: 200 + movement }],
          touches: [],
        });

        expect(screen.getByTestId("current-index")).toHaveTextContent(
          String(expectedIndex)
        );
        expect(viewport).toHaveAttribute("data-transition-state", "waiting");
        expect(track).toHaveStyle(`--pcv-drag-offset: ${movement}px`);

        act(() => {
          vi.advanceTimersByTime(1200);
        });
        act(() => {
          animationFrames.shift()?.(0);
        });

        expect(viewport).toHaveAttribute("data-transition-state", "active");
        expect(track).toHaveStyle("--pcv-drag-offset: 0px");
      } finally {
        vi.useRealTimers();
        vi.unstubAllGlobals();
      }
    }
  );
});
