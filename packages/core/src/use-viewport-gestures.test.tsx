import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PageNavigation } from "./page-navigation";
import { useViewportGestures } from "./use-viewport-gestures";
import { ViewerProvider } from "./viewer-context";
import type { PageFitMode } from "./viewer-context";
import { Viewport } from "./viewport";
import type { TestPage } from "./viewport-test-helpers";
import {
  CurrentIndexIndicator,
  MockResizeObserver,
  pages,
  pressViewportKey,
  renderViewport,
  setViewportRect,
} from "./viewport-test-helpers";

const renderControlledViewport = ({
  initialPageFitMode = "height" as PageFitMode,
} = {}) =>
  render(
    <ViewerProvider
      pages={pages}
      initialPageFitMode={initialPageFitMode}
      initialViewMode="single"
    >
      <div className="pcv-root">
        <Viewport />
        <PageNavigation />
      </div>
      <CurrentIndexIndicator />
    </ViewerProvider>
  );

/** Hidden controls carry no accessible name, so the class is the only handle. */
const getControlElements = (container: HTMLElement) => {
  const navigation = container.querySelector<HTMLElement>(
    ".pcv-page-navigation"
  );
  const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");

  if (navigation === null || viewport === null) {
    throw new Error("The viewport and its navigation were not rendered.");
  }

  return { navigation, viewport };
};

describe(useViewportGestures, () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    MockResizeObserver.reset();
  });

  it("handles ArrowLeft and ArrowRight in LTR", () => {
    renderViewport({ initialIndex: 1, initialReadingDirection: "ltr" });

    pressViewportKey("ArrowRight");
    expect(screen.getByTestId("current-index")).toHaveTextContent("2");

    pressViewportKey("ArrowLeft");
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("handles ArrowLeft and ArrowRight in RTL", () => {
    renderViewport({ initialIndex: 1, initialReadingDirection: "rtl" });

    pressViewportKey("ArrowRight");
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");

    pressViewportKey("ArrowLeft");
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("ignores the arrow keys pressed outside the viewport", () => {
    renderViewport({ initialIndex: 1, initialReadingDirection: "ltr" });

    expect(fireEvent.keyDown(window, { key: "ArrowRight" })).toBeTruthy();
    expect(fireEvent.keyDown(document.body, { key: "ArrowLeft" })).toBeTruthy();
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("turns only the viewer whose viewport takes the key", () => {
    render(
      <>
        {["First", "Second"].map((name) => (
          <ViewerProvider
            initialIndex={1}
            initialReadingDirection="ltr"
            key={name}
            pages={pages}
          >
            <Viewport aria-label={name} renderPage={() => null} />
            <CurrentIndexIndicator />
          </ViewerProvider>
        ))}
      </>
    );

    fireEvent.keyDown(screen.getByRole("region", { name: "First" }), {
      key: "ArrowRight",
    });

    const [first, second] = screen.getAllByTestId("current-index");
    expect(first).toHaveTextContent("2");
    expect(second).toHaveTextContent("1");
  });

  it("answers the arrow keys from anywhere with the global keyboard scope", () => {
    renderViewport({
      gestures: { keyboard: { scope: "global" } },
      initialIndex: 1,
      initialReadingDirection: "ltr",
    });

    expect(fireEvent.keyDown(window, { key: "ArrowRight" })).toBeFalsy();
    expect(screen.getByTestId("current-index")).toHaveTextContent("2");

    // The viewport handles its own key once, without the global listener.
    pressViewportKey("ArrowLeft");
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("leaves the arrow keys alone while the keyboard gesture is disabled", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <div className="pcv-root">
          <Viewport
            gestures={{ keyboard: { enabled: false, scope: "global" } }}
          />
          <PageNavigation />
        </div>
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const { navigation } = getControlElements(container);

    expect(pressViewportKey("ArrowLeft")).toBeTruthy();
    expect(fireEvent.keyDown(window, { key: "ArrowLeft" })).toBeTruthy();
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");

    // The controls stay reachable from the keyboard.
    expect(pressViewportKey("Enter")).toBeFalsy();
    expect(navigation).toHaveAttribute("aria-hidden", "false");
  });

  it("does not navigate from editable or interactive descendants", () => {
    render(
      <ViewerProvider pages={pages} initialIndex={1}>
        <Viewport<TestPage>
          renderPage={() => (
            <>
              <input aria-label="Title" />
              <textarea aria-label="Description" />
              <select aria-label="Page size">
                <option>One page</option>
              </select>
              <div aria-label="Notes" contentEditable />
              <button type="button">Open menu</button>
            </>
          )}
        />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );

    for (const control of [
      screen.getByRole("textbox", { name: "Title" }),
      screen.getByRole("textbox", { name: "Description" }),
      screen.getByRole("combobox", { name: "Page size" }),
      screen.getByLabelText("Notes"),
      screen.getByRole("button", { name: "Open menu" }),
    ]) {
      expect(fireEvent.keyDown(control, { key: "ArrowRight" })).toBeTruthy();
      expect(screen.getByTestId("current-index")).toHaveTextContent("1");
    }
  });

  it("navigates and prevents browser scrolling when the viewport is focused", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "ltr",
    });
    const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");

    expect(viewport).not.toBeNull();
    if (viewport === null) {
      return;
    }

    viewport.focus();
    expect(fireEvent.keyDown(viewport, { key: "ArrowRight" })).toBeFalsy();
    expect(screen.getByTestId("current-index")).toHaveTextContent("2");
  });

  it("navigates by edge click in LTR", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "ltr",
    });
    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    setViewportRect(viewport);
    fireEvent.click(viewport, { clientX: 95 });
    expect(screen.getByTestId("current-index")).toHaveTextContent("2");

    fireEvent.click(viewport, { clientX: 5 });
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("navigates by edge click in RTL", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "rtl",
    });
    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    setViewportRect(viewport);
    fireEvent.click(viewport, { clientX: 5 });
    expect(screen.getByTestId("current-index")).toHaveTextContent("2");

    fireEvent.click(viewport, { clientX: 95 });
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("toggles the reader controls from the edges while edge clicks are disabled", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <div className="pcv-root">
          <Viewport gestures={{ edgeClick: { enabled: false } }} />
          <PageNavigation />
        </div>
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const { navigation, viewport } = getControlElements(container);

    setViewportRect(viewport);
    fireEvent.click(viewport, { clientX: 5 });

    expect(navigation).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");
  });

  it("turns the page from edges as wide as the edge click ratio", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <div className="pcv-root">
          <Viewport gestures={{ edgeClick: { ratio: 0.1 } }} />
          <PageNavigation />
        </div>
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const { navigation, viewport } = getControlElements(container);

    setViewportRect(viewport);
    fireEvent.click(viewport, { clientX: 20 });

    expect(navigation).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");

    fireEvent.click(viewport, { clientX: 5 });

    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("navigates by swipe in LTR", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "ltr",
    });
    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("2");

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("navigates by swipe in RTL", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "rtl",
    });
    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("0");

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("does not turn page on short swipe", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "ltr",
    });
    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 170 }],
    });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("neither drags nor turns the page while swipes are disabled", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <Viewport gestures={{ swipe: { enabled: false } }} />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const viewport = container.querySelector(".pcv-viewport");
    const track = container.querySelector(".pcv-viewport-track");

    if (viewport === null || track === null) {
      throw new Error("The default viewport rail was not rendered.");
    }

    fireEvent.touchStart(viewport, { touches: [{ clientX: 200 }] });
    fireEvent.touchMove(viewport, { touches: [{ clientX: 120 }] });

    expect(viewport).not.toHaveAttribute("data-dragging");
    expect(track).toHaveStyle("--pcv-drag-offset: 0px");

    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("0");
  });

  it("returns the rail when the swipe is disabled mid-drag", () => {
    const { container, rerender } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <Viewport />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const viewport = container.querySelector(".pcv-viewport");
    const track = container.querySelector(".pcv-viewport-track");

    if (viewport === null || track === null) {
      throw new Error("The default viewport rail was not rendered.");
    }

    fireEvent.touchStart(viewport, { touches: [{ clientX: 200 }] });
    fireEvent.touchMove(viewport, { touches: [{ clientX: 120 }] });
    expect(track).toHaveStyle("--pcv-drag-offset: -80px");

    rerender(
      <ViewerProvider pages={pages} initialViewMode="single">
        <Viewport gestures={{ swipe: { enabled: false } }} />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    fireEvent.touchEnd(viewport);

    expect(track).toHaveStyle("--pcv-drag-offset: 0px");
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");
  });

  it("does not take two disabled swipes for a double tap", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <Viewport gestures={{ swipe: { enabled: false } }} />
      </ViewerProvider>
    );
    const viewport = container.querySelector(".pcv-viewport");

    if (viewport === null) {
      throw new Error("The viewport was not rendered.");
    }

    for (let swipe = 0; swipe < 2; swipe += 1) {
      fireEvent.touchStart(viewport, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      fireEvent.touchMove(viewport, {
        touches: [{ clientX: 120, clientY: 100 }],
      });
      fireEvent.touchEnd(viewport, {
        changedTouches: [{ clientX: 120, clientY: 100 }],
        touches: [],
      });
    }

    expect(viewport).toHaveAttribute("data-page-fit-mode", "height");
  });

  it("moves the page rail while a touch swipe is in progress", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <Viewport />
      </ViewerProvider>
    );
    const viewport = container.querySelector(".pcv-viewport");
    const track = container.querySelector(".pcv-viewport-track");

    if (viewport === null || track === null) {
      throw new Error("The default viewport rail was not rendered.");
    }

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 120 }],
    });

    expect(viewport).toHaveAttribute("data-dragging", "true");
    expect(track).toHaveStyle("--pcv-drag-offset: -80px");

    fireEvent.touchCancel(viewport);

    expect(viewport).not.toHaveAttribute("data-dragging");
    expect(track).toHaveStyle("--pcv-drag-offset: 0px");
  });

  it("toggles the shared reader controls with a click away from the edges", () => {
    const { container } = renderControlledViewport();
    const { navigation, viewport } = getControlElements(container);

    setViewportRect(viewport);
    fireEvent.click(viewport, { clientX: 50 });

    expect(navigation).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");

    fireEvent.click(viewport, { clientX: 50 });

    expect(navigation).toHaveAttribute("aria-hidden", "true");
  });

  it("toggles the shared reader controls when a pannable page is clicked", () => {
    const { container } = renderControlledViewport({
      initialPageFitMode: "actual",
    });
    const { navigation, viewport } = getControlElements(container);

    setViewportRect(viewport);
    fireEvent.click(viewport, { clientX: 5 });

    expect(navigation).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");
  });

  it("toggles the shared reader controls from the keyboard", () => {
    const { container } = renderControlledViewport();
    const { navigation, viewport } = getControlElements(container);

    viewport.focus();
    expect(fireEvent.keyDown(viewport, { key: "Enter" })).toBeFalsy();
    expect(navigation).toHaveAttribute("aria-hidden", "false");

    expect(fireEvent.keyDown(viewport, { key: " " })).toBeFalsy();
    expect(navigation).toHaveAttribute("aria-hidden", "true");
  });

  it("does not bubble viewport touch gestures to its parent", () => {
    const onTouch = vi.fn<() => void>();
    const { container } = render(
      <div
        onTouchCancel={onTouch}
        onTouchEnd={onTouch}
        onTouchMove={onTouch}
        onTouchStart={onTouch}
      >
        <ViewerProvider pages={pages} initialViewMode="single">
          <Viewport />
        </ViewerProvider>
      </div>
    );
    const viewport = container.querySelector(".pcv-viewport");

    if (viewport === null) {
      throw new Error("The viewport was not rendered.");
    }

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchEnd(viewport);

    expect(onTouch).not.toHaveBeenCalled();
  });
});
