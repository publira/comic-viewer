import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  NextPageButton,
  PageProgress,
  PageProgressSlider,
  PageProgressTrack,
  PageNavigation,
  PageStatus,
  PreviousPageButton,
} from "./page-navigation";
import { useViewerContext, ViewerProvider } from "./viewer-context";
import type { ReadingDirection, ViewMode } from "./viewer-context";
import { EndPage, StartPage } from "./viewer-slots";

const pages = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
  { id: "p3", src: "page3.png", title: "Page 3" },
  { id: "p4", src: "page4.png", title: "Page 4" },
  { id: "p5", src: "page5.png", title: "Page 5" },
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
const getNavigation = (container: HTMLElement): HTMLElement => {
  const navigation = container.querySelector<HTMLElement>(
    ".pcv-page-navigation"
  );

  if (navigation === null) {
    throw new Error("The page navigation was not rendered.");
  }

  return navigation;
};

interface RenderPageNavigationOptions {
  initialIndex?: number;
  initialReadingDirection?: ReadingDirection;
  initialViewMode?: ViewMode;
  spreadStartIndex?: number;
}

const renderPageNavigation = ({
  initialIndex = 0,
  initialReadingDirection = "rtl",
  initialViewMode = "single",
  spreadStartIndex = 0,
}: RenderPageNavigationOptions = {}) => {
  const result = render(
    <ViewerProvider
      pages={pages}
      initialIndex={initialIndex}
      initialReadingDirection={initialReadingDirection}
      initialViewMode={initialViewMode}
      spreadStartIndex={spreadStartIndex}
    >
      <ControlsToggle />
      <PageNavigation>
        <PreviousPageButton />
        <PageStatus />
        <NextPageButton />
      </PageNavigation>
    </ViewerProvider>
  );
  toggleControls();

  return result;
};

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

  it("stays hidden until the shared reader controls are revealed", () => {
    const { container } = render(
      <ViewerProvider pages={pages}>
        <ControlsToggle />
        <PageNavigation />
      </ViewerProvider>
    );

    const navigation = getNavigation(container);

    expect(navigation).toHaveAttribute("aria-hidden", "true");
    expect(navigation).toHaveAttribute("inert");

    toggleControls();

    expect(navigation).toHaveAttribute("aria-hidden", "false");
    expect(navigation).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("renders only the page-turn controls by default", () => {
    render(
      <ViewerProvider pages={pages}>
        <ControlsToggle />
        <PageNavigation />
      </ViewerProvider>
    );
    toggleControls();

    expect(screen.getByRole("button", { name: "Previous page" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Next page" })).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("derives public progress-track values from the viewer state", () => {
    render(
      <ViewerProvider pages={pages} initialIndex={1} initialViewMode="double">
        <PageProgress>
          <PageProgressTrack data-testid="progress-track" />
        </PageProgress>
      </ViewerProvider>
    );

    expect(screen.getByTestId("progress-track")).toHaveAttribute("max", "5");
    expect(screen.getByTestId("progress-track")).toHaveAttribute("value", "3");
  });

  it("maps the slider onto the navigable indices, extra pages included", () => {
    render(
      <ViewerProvider pages={pages}>
        <StartPage>Before the chapter</StartPage>
        <EndPage>After the chapter</EndPage>
        <PageProgress>
          <PageProgressSlider />
        </PageProgress>
      </ViewerProvider>
    );

    const slider = screen.getByRole("slider", { name: "Reading progress" });

    // The slider counts in the indices goTo takes, so the extra pages at the
    // ends of the reading sequence are positions on it like any page.
    expect(slider).toHaveAttribute("min", "-1");
    expect(slider).toHaveAttribute("max", "5");
    expect(slider).toHaveAttribute("aria-valuetext", "Start page");
    expect(slider).toHaveValue("-1");
  });

  it("commits a step taken without a drag straight away", () => {
    const onIndexChange = vi.fn<(index: number) => void>();
    render(
      <ViewerProvider pages={pages} onIndexChange={onIndexChange}>
        <PageProgress>
          <PageProgressSlider />
          <PageStatus />
        </PageProgress>
      </ViewerProvider>
    );

    // An arrow key moves a range input by one step and reports it the same way
    // a drag does, with no release of its own to wait for.
    fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });

    expect(onIndexChange).toHaveBeenCalledWith(1);
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });

  it("follows a drag with the progress and turns the page on release", () => {
    const onIndexChange = vi.fn<(index: number) => void>();
    render(
      <ViewerProvider pages={pages} onIndexChange={onIndexChange}>
        <PageProgress>
          <PageProgressSlider />
          <PageProgressTrack data-testid="progress-track" />
          <PageStatus />
        </PageProgress>
      </ViewerProvider>
    );

    const slider = screen.getByRole("slider");

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: "3" } });

    // The page under the thumb is reported all through the drag, yet nothing
    // is navigated to until the drag is over.
    expect(screen.getByTestId("progress-track")).toHaveAttribute("value", "4");
    expect(slider).toHaveAttribute("aria-valuetext", "Page 4 of 5");
    expect(onIndexChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(window);

    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(3);
    expect(screen.getByText("Page 4 of 5")).toBeInTheDocument();
  });

  it("snaps a drag to the page a spread starts from", () => {
    const onIndexChange = vi.fn<(index: number) => void>();
    render(
      <ViewerProvider
        pages={pages}
        initialViewMode="double"
        onIndexChange={onIndexChange}
        spreadStartIndex={1}
      >
        <PageProgress>
          <PageProgressSlider />
          <PageStatus />
        </PageProgress>
      </ViewerProvider>
    );

    const slider = screen.getByRole("slider");

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: "4" } });

    // The facing page of a spread is not an index of its own, so the value
    // falls back to the page the spread it belongs to opens with.
    expect(slider).toHaveValue("3");
    expect(screen.getByText("Pages 4-5 of 5")).toBeInTheDocument();

    fireEvent.pointerUp(window);

    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(3);
  });

  it("moves a step taken without a drag on by a whole spread", () => {
    const onIndexChange = vi.fn<(index: number) => void>();
    render(
      <ViewerProvider
        pages={pages}
        initialViewMode="double"
        onIndexChange={onIndexChange}
      >
        <PageProgress>
          <PageProgressSlider />
          <PageStatus />
        </PageProgress>
      </ViewerProvider>
    );

    // The step of a range input is one index, which in double-page mode lands
    // on the facing page of the spread the reader is already on.
    fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });

    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(2);
    expect(screen.getByText("Pages 3-4 of 5")).toBeInTheDocument();
  });

  it("leaves the drag to a consumer that cancels the change event", () => {
    const onIndexChange = vi.fn<(index: number) => void>();
    render(
      <ViewerProvider pages={pages} onIndexChange={onIndexChange}>
        <PageProgress>
          <PageProgressSlider
            onChange={(event) => {
              event.preventDefault();
            }}
          />
          <PageStatus />
        </PageProgress>
      </ViewerProvider>
    );

    fireEvent.change(screen.getByRole("slider"), { target: { value: "3" } });

    expect(onIndexChange).not.toHaveBeenCalled();
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });

  it("disables the slider while the document holds a single position", () => {
    render(
      <ViewerProvider pages={pages.slice(0, 1)}>
        <PageProgress>
          <PageProgressSlider />
        </PageProgress>
      </ViewerProvider>
    );

    expect(screen.getByRole("slider")).toBeDisabled();
  });

  it("hides the progress only when a consumer asks for it", () => {
    render(
      <ViewerProvider pages={pages}>
        <PageProgress visible={false}>
          <PageProgressTrack />
        </PageProgress>
      </ViewerProvider>
    );

    expect(
      screen.getByRole("progressbar", { hidden: true }).parentElement
    ).toHaveAttribute("aria-hidden", "true");
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

  it("navigates a single cover page before odd-indexed spreads", () => {
    renderPageNavigation({ initialViewMode: "double", spreadStartIndex: 1 });

    const previous = screen.getByRole("button", { name: "Previous page" });
    const next = screen.getByRole("button", { name: "Next page" });

    fireEvent.click(next);

    expect(screen.getByText("Pages 2-3 of 5")).toBeInTheDocument();
    expect(previous).toBeEnabled();

    fireEvent.click(next);

    expect(screen.getByText("Pages 4-5 of 5")).toBeInTheDocument();
    expect(next).toBeDisabled();

    fireEvent.click(previous);

    expect(screen.getByText("Pages 2-3 of 5")).toBeInTheDocument();
  });

  it("keeps pre-spread pages single for an even start index", () => {
    renderPageNavigation({
      initialIndex: 1,
      initialViewMode: "double",
      spreadStartIndex: 2,
    });

    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Pages 3-4 of 5")).toBeInTheDocument();
  });

  it("permits custom arrangement and styling with the individual controls", () => {
    render(
      <ViewerProvider pages={pages} initialReadingDirection="ltr">
        <ControlsToggle />
        <PageNavigation className="reader-controls">
          <NextPageButton className="next-control">Forward</NextPageButton>
          <PageStatus className="status-control" />
          <PreviousPageButton className="previous-control">
            Back
          </PreviousPageButton>
        </PageNavigation>
      </ViewerProvider>
    );
    toggleControls();

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
