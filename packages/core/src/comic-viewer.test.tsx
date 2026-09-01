import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComicViewer } from "./comic-viewer";
import { PageStatus } from "./page-navigation";
import type { PageResolver } from "./page-source";
import { definePlugin } from "./plugin";
import { Toolbar } from "./toolbar";
import { useViewerContext } from "./viewer-context";
import { Viewport } from "./viewport";

class MockResizeObserver {
  observe = vi.fn<() => void>();
  disconnect = vi.fn<() => void>();
  unobserve = vi.fn<() => void>();
}

const pages = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
];

type TestPage = (typeof pages)[number];

const PluginCount = () => {
  const { plugins } = useViewerContext();
  return <output data-testid="plugin-count">{plugins.length}</output>;
};

describe(ComicViewer, () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  it("resolves the pages of a lazily loaded document", async () => {
    const resolvePage = vi.fn<PageResolver<TestPage>>((index) => ({
      id: `p${index + 1}`,
      src: `page${index + 1}.png`,
      title: `Page ${index + 1}`,
    }));
    render(
      <ComicViewer<TestPage> pageCount={40} resolvePage={resolvePage}>
        <PageStatus />
      </ComicViewer>
    );

    expect(screen.getByRole("status")).toHaveTextContent("Pages 1-2 of 40");

    await waitFor(() => {
      expect(resolvePage).toHaveBeenCalledTimes(5);
    });

    expect(resolvePage.mock.calls.map(([index]) => index)).toStrictEqual([
      0, 1, 2, 3, 4,
    ]);
  });

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

  it("registers plugins passed to ComicViewer", () => {
    const plugin = definePlugin({ name: "analytics" });
    render(
      <ComicViewer pages={pages} plugins={[plugin]}>
        <PluginCount />
      </ComicViewer>
    );

    expect(screen.getByTestId("plugin-count")).toHaveTextContent("1");
  });

  it("Viewport works alongside ComicViewer", () => {
    const { container } = render(
      <ComicViewer pages={pages}>
        <Viewport<TestPage>
          renderPage={(page) => <div data-testid={page.id}>{page.title}</div>}
        />
      </ComicViewer>
    );

    expect(container.querySelector(".pcv-viewport")).not.toBeNull();
    expect(screen.getByTestId("p1")).toBeInTheDocument();
  });

  it("Toolbar works alongside ComicViewer", () => {
    const { container } = render(
      <ComicViewer pages={pages}>
        <Toolbar>
          <button type="button">Prev</button>
          <button type="button">Next</button>
        </Toolbar>
      </ComicViewer>
    );

    // The toolbar stays hidden until a viewport tap reveals the reader controls.
    expect(container.querySelector(".pcv-toolbar")).not.toBeNull();
    expect(
      screen.getByRole("button", { hidden: true, name: "Prev" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { hidden: true, name: "Next" })
    ).toBeInTheDocument();
  });

  it("can render Viewport and Toolbar together", () => {
    const { container } = render(
      <ComicViewer pages={pages}>
        <Viewport<TestPage>
          renderPage={(page) => <div data-testid={page.id}>{page.title}</div>}
        />
        <Toolbar>
          <span data-testid="toolbar-label">controls</span>
        </Toolbar>
      </ComicViewer>
    );

    expect(container.querySelector(".pcv-viewport")).not.toBeNull();
    expect(container.querySelector(".pcv-toolbar")).not.toBeNull();
    expect(screen.getByTestId("toolbar-label")).toBeInTheDocument();
  });
});
