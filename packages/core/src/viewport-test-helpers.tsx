import { fireEvent, render, screen, within } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { JSX } from "react";
import { vi } from "vitest";
import type { Mock } from "vitest";

import type { ViewerPlugin } from "./plugin";
import type { ViewportGestures } from "./use-viewport-gestures";
import type { ReadingDirection } from "./viewer-context";
import { ViewerProvider, useViewerContext } from "./viewer-context";
import { Viewport } from "./viewport";

export type MockFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<unknown>;

/** Stands in for every ResizeObserver the viewport creates until disconnected. */
// eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
export class MockResizeObserver {
  static callbacks: Set<ResizeObserverCallback> =
    new Set<ResizeObserverCallback>();

  readonly #callback: ResizeObserverCallback;

  // eslint-disable-next-line promise/prefer-await-to-callbacks
  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
    MockResizeObserver.callbacks.add(callback);
  }

  observe: Mock<() => void> = vi.fn<() => void>();
  disconnect: Mock<() => void> = vi.fn<() => void>(() => {
    MockResizeObserver.callbacks.delete(this.#callback);
  });
  unobserve: Mock<() => void> = vi.fn<() => void>();

  static reset(): void {
    MockResizeObserver.callbacks.clear();
  }

  static trigger(width: number, height = 100): void {
    for (const notify of MockResizeObserver.callbacks) {
      notify(
        [
          {
            contentRect: { height, width } as DOMRectReadOnly,
          } as ResizeObserverEntry,
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        null as any
      );
    }
  }
}

export interface TestPage {
  id: string;
  src: string;
  title: string;
}

export const pages: TestPage[] = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
  { id: "p3", src: "page3.png", title: "Page 3" },
  { id: "p4", src: "page4.png", title: "Page 4" },
];

export const setViewportRect = (viewport: Element, width = 100): void => {
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

/**
 * Queries the spread on screen, apart from the neighbouring spreads the page
 * rail holds beside it.
 */
export const withinCurrentPageSet = (): ReturnType<typeof within> => {
  const pageSet = document.querySelector<HTMLElement>(
    '.pcv-viewport-page-set[data-rail-slot="current"]'
  );
  if (pageSet === null) {
    throw new Error("No page set is on screen.");
  }

  return within(pageSet);
};

/** Presses a key on the viewport, which answers the arrow keys once focused. */
export const pressViewportKey = (key: string): boolean =>
  fireEvent.keyDown(screen.getByRole("region", { name: "Comic pages" }), {
    key,
  });

export const CurrentIndexIndicator = (): JSX.Element => {
  const { currentIndex } = useViewerContext();
  return <div data-testid="current-index">{currentIndex}</div>;
};

interface RenderViewportOptions {
  gestures?: ViewportGestures;
  initialIndex?: number;
  initialReadingDirection?: ReadingDirection;
  plugins?: readonly ViewerPlugin[];
  spreadStartIndex?: number;
  threshold?: number;
}

export const renderViewport = ({
  gestures,
  initialIndex = 0,
  initialReadingDirection = "rtl",
  plugins = [],
  spreadStartIndex = 0,
  threshold = 768,
}: RenderViewportOptions = {}): RenderResult =>
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
        gestures={gestures}
      />
      <CurrentIndexIndicator />
    </ViewerProvider>
  );

interface MockPageImagesOptions {
  fetch?: MockFetch;
}

interface MockPageImages {
  drawImage: Mock<() => void>;
  fetchMock: Mock<MockFetch>;
  image: ImageBitmap;
  restore: () => void;
}

/** Stubs canvas decoding and page fetching for viewport rendering tests. */
export const mockPageImages = ({
  fetch,
}: MockPageImagesOptions = {}): MockPageImages => {
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
