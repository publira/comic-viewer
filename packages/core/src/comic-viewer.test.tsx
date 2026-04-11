import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComicViewer } from "./comic-viewer";

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

const pages = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
];

type TestPage = (typeof pages)[number];

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

describe("ComicViewer", () => {
  it("renders a div with the pcv-root class", () => {
    const { container } = render(
      <ComicViewer pages={pages}>
        <div data-testid="child" />
      </ComicViewer>
    );

    expect(container.querySelector(".pcv-root")).not.toBeNull();
  });

  it("appends a custom className to the root element", () => {
    const { container } = render(
      <ComicViewer pages={pages} className="my-viewer">
        <div />
      </ComicViewer>
    );

    expect(container.querySelector(".pcv-root.my-viewer")).not.toBeNull();
  });

  it("renders children correctly", () => {
    render(
      <ComicViewer pages={pages}>
        <div data-testid="inner" />
      </ComicViewer>
    );

    expect(screen.getByTestId("inner")).toBeInTheDocument();
  });

  it("ComicViewer.Viewport works as a sub-component", () => {
    const { container } = render(
      <ComicViewer pages={pages}>
        <ComicViewer.Viewport<TestPage>
          renderPage={(page) => <div data-testid={page.id}>{page.title}</div>}
        />
      </ComicViewer>
    );

    expect(container.querySelector(".pcv-viewport")).not.toBeNull();
    expect(screen.getByTestId("p1")).toBeInTheDocument();
  });

  it("ComicViewer.Toolbar works as a sub-component", () => {
    const { container } = render(
      <ComicViewer pages={pages}>
        <ComicViewer.Toolbar>
          <button type="button">Prev</button>
          <button type="button">Next</button>
        </ComicViewer.Toolbar>
      </ComicViewer>
    );

    expect(container.querySelector(".pcv-toolbar")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Prev" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("can render Viewport and Toolbar together", () => {
    const { container } = render(
      <ComicViewer pages={pages}>
        <ComicViewer.Viewport<TestPage>
          renderPage={(page) => <div data-testid={page.id}>{page.title}</div>}
        />
        <ComicViewer.Toolbar>
          <span data-testid="toolbar-label">controls</span>
        </ComicViewer.Toolbar>
      </ComicViewer>
    );

    expect(container.querySelector(".pcv-viewport")).not.toBeNull();
    expect(container.querySelector(".pcv-toolbar")).not.toBeNull();
    expect(screen.getByTestId("toolbar-label")).toBeInTheDocument();
  });
});
