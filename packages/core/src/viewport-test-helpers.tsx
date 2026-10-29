import { fireEvent, render, screen, within } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { vi } from "vitest";
import type { Mock, MockInstance } from "vitest";

import type { ViewerPlugin } from "./plugin";
import type { ViewportGestures } from "./use-viewport-gestures";
import type { ReadingDirection } from "./viewer-context";
import { ViewerProvider } from "./viewer-context";
import { Viewport } from "./viewport";
import { CurrentIndexIndicator } from "./viewport-test-components";

/** The part of a `Response` the page loader reads. */
export type FakeResponse = Pick<Response, "ok"> &
  Partial<Pick<Response, "arrayBuffer" | "status" | "statusText">>;

export type MockFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<FakeResponse>;

/** A resize of the observed element to `width` by `height` pixels. */
export const createResizeEntry = (
  width: number,
  height = 100
): ResizeObserverEntry => ({
  borderBoxSize: [],
  contentBoxSize: [],
  contentRect: new DOMRectReadOnly(0, 0, width, height),
  devicePixelContentBoxSize: [],
  target: document.body,
});

/** Stands in for every ResizeObserver the viewport creates until disconnected. */
// eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
export class MockResizeObserver implements ResizeObserver {
  static readonly observers: Map<ResizeObserverCallback, MockResizeObserver> =
    new Map<ResizeObserverCallback, MockResizeObserver>();

  readonly #callback: ResizeObserverCallback;

  // eslint-disable-next-line promise/prefer-await-to-callbacks
  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
    MockResizeObserver.observers.set(callback, this);
  }

  observe: Mock<() => void> = vi.fn<() => void>();
  disconnect: Mock<() => void> = vi.fn<() => void>(() => {
    MockResizeObserver.observers.delete(this.#callback);
  });
  unobserve: Mock<() => void> = vi.fn<() => void>();

  static reset(): void {
    MockResizeObserver.observers.clear();
  }

  static trigger(width: number, height = 100): void {
    for (const [notify, observer] of MockResizeObserver.observers) {
      notify([createResizeEntry(width, height)], observer);
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
  vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, width, 100)
  );
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

/**
 * Gives every canvas a 2D context that records what is drawn, since jsdom has
 * no canvas of its own.
 */
export const stubCanvasContext = (
  context: Partial<CanvasRenderingContext2D>
): MockInstance<HTMLCanvasElement["getContext"]> =>
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    // SAFETY: the viewer draws a page through clearRect, drawImage, and
    // filter alone, which is all a test needs to provide.
    context as CanvasRenderingContext2D
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
  const image: ImageBitmap = {
    close: vi.fn<() => void>(),
    height: 1,
    width: 1,
  };

  const drawImage = vi.fn<() => void>();

  const getContext = stubCanvasContext({
    clearRect: vi.fn<() => void>(),
    drawImage,
  });

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
    vi.fn<() => Promise<ImageBitmap>>().mockResolvedValue(image)
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
