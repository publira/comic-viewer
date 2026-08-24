import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { vi } from "vitest";

import type { ViewerPlugin } from "./plugin";
import type { ReadingDirection } from "./viewer-context";
import { ViewerProvider, useViewerContext } from "./viewer-context";
import { Viewport } from "./viewport";

export type MockFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<unknown>;

// eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
export class MockResizeObserver {
  static callback: ResizeObserverCallback | null = null;

  // eslint-disable-next-line promise/prefer-await-to-callbacks
  constructor(callback: ResizeObserverCallback) {
    MockResizeObserver.callback = callback;
  }

  observe = vi.fn<() => void>();
  disconnect = vi.fn<() => void>();
  unobserve = vi.fn<() => void>();

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

export const pages = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
  { id: "p3", src: "page3.png", title: "Page 3" },
  { id: "p4", src: "page4.png", title: "Page 4" },
];

export type TestPage = (typeof pages)[number];

export const setViewportRect = (viewport: Element, width = 100) => {
  vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
    bottom: 100,
    height: 100,
    left: 0,
    right: width,
    toJSON: () => ({}),
    top: 0,
    width,
    x: 0,
    y: 0,
  } as DOMRect);
};

export const CurrentIndexIndicator = () => {
  const { currentIndex } = useViewerContext();
  return <div data-testid="current-index">{currentIndex}</div>;
};

export const renderViewport = ({
  initialIndex = 0,
  initialReadingDirection = "rtl" as ReadingDirection,
  plugins = [] as readonly ViewerPlugin[],
  spreadStartIndex = 0,
  threshold = 768,
} = {}): RenderResult =>
  render(
    <ViewerProvider
      pages={pages}
      initialIndex={initialIndex}
      initialReadingDirection={initialReadingDirection}
      plugins={plugins}
      spreadStartIndex={spreadStartIndex}
    >
      <Viewport<TestPage>
        renderPage={(page) => <div data-testid={page.id}>{page.title}</div>}
        doublePageThreshold={threshold}
      />
      <CurrentIndexIndicator />
    </ViewerProvider>
  );

interface MockPageImagesOptions {
  fetch?: MockFetch;
}

/** Stubs canvas decoding and page fetching for viewport rendering tests. */
export const mockPageImages = ({ fetch }: MockPageImagesOptions = {}) => {
  const image = {
    close: vi.fn<() => void>(),
    height: 1,
    width: 1,
  } as unknown as ImageBitmap;
  const drawImage = vi.fn<() => void>();
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({
      clearRect: vi.fn<() => void>(),
      drawImage,
    } as unknown as CanvasRenderingContext2D);
  const fetchMock = vi.fn<MockFetch>(
    fetch ??
      (() =>
        Promise.resolve({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
          ok: true,
        }))
  );
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn<() => Promise<unknown>>().mockResolvedValue(image)
  );
  vi.stubGlobal("fetch", fetchMock);

  return {
    drawImage,
    fetchMock,
    image,
    restore: () => {
      getContext.mockRestore();
      vi.unstubAllGlobals();
    },
  };
};
