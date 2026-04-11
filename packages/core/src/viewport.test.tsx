import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ViewerProvider } from "./viewer-context";
import type { ReadingDirection } from "./viewer-context";
import { Viewport } from "./viewport";

// eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
class MockResizeObserver {
  static callback: ResizeObserverCallback | null = null;

  // eslint-disable-next-line promise/prefer-await-to-callbacks
  constructor(callback: ResizeObserverCallback) {
    MockResizeObserver.callback = callback;
  }

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();

  static trigger(width: number) {
    MockResizeObserver.callback?.(
      [
        {
          contentRect: { width } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      null as any
    );
  }
}

const pages = [
  { id: "p1", label: "Page 1" },
  { id: "p2", label: "Page 2" },
  { id: "p3", label: "Page 3" },
  { id: "p4", label: "Page 4" },
];

type TestPage = (typeof pages)[number];

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  MockResizeObserver.callback = null;
});

const renderViewport = ({
  initialIndex = 0,
  initialReadingDirection = "rtl" as ReadingDirection,
  threshold = 768,
} = {}) =>
  render(
    <ViewerProvider
      pages={pages}
      initialIndex={initialIndex}
      initialReadingDirection={initialReadingDirection}
    >
      <Viewport<TestPage>
        renderPage={(page) => <div data-testid={page.id}>{page.label}</div>}
        doublePageThreshold={threshold}
      />
    </ViewerProvider>
  );

describe("Viewport", () => {
  it("renders only the current page in single mode", () => {
    renderViewport();

    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.queryByTestId("p2")).not.toBeInTheDocument();
  });

  it("renders 2 pages in double mode (RTL)", () => {
    renderViewport({ initialIndex: 0 });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    // RTL: index 1 on the left, index 0 on the right
    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.getByTestId("p2")).toBeInTheDocument();
    expect(screen.queryByTestId("p3")).not.toBeInTheDocument();
  });

  it("renders 2 pages in double mode (LTR)", () => {
    renderViewport({ initialIndex: 0, initialReadingDirection: "ltr" });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.getByTestId("p2")).toBeInTheDocument();
  });

  it("renders the next page first (on the left) in RTL double mode", () => {
    renderViewport({ initialIndex: 0, initialReadingDirection: "rtl" });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    const items = screen.getAllByTestId(/^p/);
    // RTL order: [p2, p1]
    expect(items[0]).toHaveAttribute("data-testid", "p2");
    expect(items[1]).toHaveAttribute("data-testid", "p1");
  });

  it("renders the current page first (on the left) in LTR double mode", () => {
    renderViewport({ initialIndex: 0, initialReadingDirection: "ltr" });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    const items = screen.getAllByTestId(/^p/);
    // LTR order: [p1, p2]
    expect(items[0]).toHaveAttribute("data-testid", "p1");
    expect(items[1]).toHaveAttribute("data-testid", "p2");
  });

  it("renders only 1 page on the last page in double mode when no next page exists", () => {
    // pages[3] = p4 is the last page
    renderViewport({ initialIndex: 3 });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    expect(screen.getByTestId("p4")).toBeInTheDocument();
    expect(screen.queryByTestId("p5")).not.toBeInTheDocument();
  });

  it("applies the pcv-viewport class", () => {
    const { container } = renderViewport();

    expect(container.querySelector(".pcv-viewport")).not.toBeNull();
  });

  it("appends a custom className to the viewport element", () => {
    const { container } = render(
      <ViewerProvider pages={pages}>
        <Viewport<TestPage>
          renderPage={(page) => <div>{page.label}</div>}
          className="custom-class"
        />
      </ViewerProvider>
    );

    expect(container.querySelector(".custom-class")).not.toBeNull();
    expect(container.querySelector(".pcv-viewport")).not.toBeNull();
  });

  it("updates rendered pages when mode switches single → double → single", () => {
    renderViewport({ initialIndex: 0 });

    // single mode
    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.queryByTestId("p2")).not.toBeInTheDocument();

    // double mode
    act(() => {
      MockResizeObserver.trigger(1024);
    });
    expect(screen.getByTestId("p2")).toBeInTheDocument();

    // back to single
    act(() => {
      MockResizeObserver.trigger(400);
    });
    expect(screen.queryByTestId("p2")).not.toBeInTheDocument();
  });
});
