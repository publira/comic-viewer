import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  NextPageButton,
  PageProgress,
  PageNavigation,
  PageStatus,
  PreviousPageButton,
} from "./page-navigation";
import { ViewerProvider } from "./viewer-context";
import type { ReadingDirection, ViewMode } from "./viewer-context";

const pages = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
  { id: "p3", src: "page3.png", title: "Page 3" },
  { id: "p4", src: "page4.png", title: "Page 4" },
  { id: "p5", src: "page5.png", title: "Page 5" },
];

interface RenderPageNavigationOptions {
  initialIndex?: number;
  initialReadingDirection?: ReadingDirection;
  initialViewMode?: ViewMode;
}

const renderPageNavigation = ({
  initialIndex = 0,
  initialReadingDirection = "rtl",
  initialViewMode = "single",
}: RenderPageNavigationOptions = {}) =>
  render(
    <ViewerProvider
      pages={pages}
      initialIndex={initialIndex}
      initialReadingDirection={initialReadingDirection}
      initialViewMode={initialViewMode}
    >
      <PageNavigation>
        <PreviousPageButton />
        <PageProgress>
          <PageStatus />
        </PageProgress>
        <NextPageButton />
      </PageNavigation>
    </ViewerProvider>
  );

describe(PageNavigation, () => {
  it("renders an accessible default navigation group", () => {
    renderPageNavigation();

    expect(
      screen.getByRole("navigation", { name: "Page navigation" })
    ).toHaveAttribute("dir", "rtl");
    expect(
      screen.getByRole("button", { name: "Previous page" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    expect(screen.getByText("Page 1 of 5")).toHaveAttribute(
      "aria-live",
      "polite"
    );
  });

  it("renders and reveals the default navigation progress", () => {
    vi.useFakeTimers();
    render(
      <ViewerProvider pages={pages}>
        <PageNavigation />
      </ViewerProvider>
    );

    expect(
      screen.getByRole("button", { name: "Previous page" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    expect(
      screen.getByRole("progressbar", { hidden: true }).parentElement
    ).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "Show reading progress" })
    );

    expect(
      screen.getByRole("progressbar", { hidden: true }).parentElement
    ).toHaveAttribute("aria-hidden", "false");

    act(() => vi.advanceTimersByTime(2000));

    expect(
      screen.getByRole("progressbar", { hidden: true }).parentElement
    ).toHaveAttribute("aria-hidden", "true");
    vi.useRealTimers();
  });

  it("moves by one page and updates its status in single-page mode", () => {
    renderPageNavigation({ initialReadingDirection: "ltr" });

    const previous = screen.getByRole("button", { name: "Previous page" });
    const next = screen.getByRole("button", { name: "Next page" });

    fireEvent.click(next);

    expect(previous).toBeEnabled();
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();

    fireEvent.click(previous);

    expect(previous).toBeDisabled();
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });

  it("moves by spreads and disables the next control at the final spread", () => {
    renderPageNavigation({ initialIndex: 2, initialViewMode: "double" });

    const next = screen.getByRole("button", { name: "Next page" });

    expect(screen.getByText("Pages 3-4 of 5")).toBeInTheDocument();
    expect(next).toBeEnabled();

    fireEvent.click(next);

    expect(screen.getByText("Page 5 of 5")).toBeInTheDocument();
    expect(next).toBeDisabled();
  });

  it("permits custom arrangement and styling with the individual controls", () => {
    render(
      <ViewerProvider pages={pages} initialReadingDirection="ltr">
        <PageNavigation className="reader-controls">
          <NextPageButton className="next-control">Forward</NextPageButton>
          <PageStatus className="status-control" />
          <PreviousPageButton className="previous-control">
            Back
          </PreviousPageButton>
        </PageNavigation>
      </ViewerProvider>
    );

    const navigation = screen.getByRole("navigation", {
      name: "Page navigation",
    });

    expect(navigation).toHaveClass("reader-controls");
    expect(navigation).toHaveAttribute("data-reading-direction", "ltr");
    expect(screen.getByRole("button", { name: "Next page" })).toHaveClass(
      "next-control"
    );
    expect(screen.getByText("Page 1 of 5")).toHaveClass("status-control");
    expect(screen.getByRole("button", { name: "Previous page" })).toHaveClass(
      "previous-control"
    );
  });

  it("does not navigate when a consumer cancels the click event", () => {
    render(
      <ViewerProvider pages={pages}>
        <NextPageButton onClick={(event) => event.preventDefault()} />
        <PageStatus />
      </ViewerProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });
});
