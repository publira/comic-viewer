import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PageLoadError } from "./page-load";
import { definePlugin } from "./plugin";
import type { ViewerPlugin } from "./plugin";
import { ViewerProvider } from "./viewer-context";
import type { ViewerPage } from "./viewer-context";
import { Viewport } from "./viewport";
import { PageCanvas, ViewportPage, usePageLoadState } from "./viewport-page";
import type { MockFetch } from "./viewport-test-helpers";
import { MockResizeObserver } from "./viewport-test-helpers";

const singlePage: ViewerPage = {
  height: 1,
  id: "p1",
  src: "page1.png",
  title: "Page 1",
  width: 1,
};

/** Renders the public load state of the page it is mounted in. */
const PageLoadProbe = () => {
  const { error, placeholder, retry, status } = usePageLoadState();

  return (
    <ViewportPage>
      <PageCanvas />
      <span data-testid="status">{status}</span>
      <span data-testid="stage">{error?.stage ?? "none"}</span>
      <span data-testid="cause">
        {error?.cause instanceof Error ? error.cause.message : "none"}
      </span>
      <span data-testid="placeholder">{String(placeholder)}</span>
      <button onClick={retry} type="button">
        Retry
      </button>
    </ViewportPage>
  );
};

interface RenderFailingPageOptions {
  fetch?: MockFetch;
  onPageLoadError?: (error: PageLoadError) => void;
  page?: ViewerPage;
  plugins?: readonly ViewerPlugin[];
}

const renderPageLoad = ({
  fetch,
  onPageLoadError,
  page = singlePage,
  plugins = [],
}: RenderFailingPageOptions = {}) => {
  const fetchMock = vi.fn<MockFetch>(
    fetch ??
      (() =>
        Promise.resolve({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
          ok: true,
        }))
  );
  vi.stubGlobal("fetch", fetchMock);

  render(
    <ViewerProvider pages={[page]} plugins={plugins}>
      <Viewport onPageLoadError={onPageLoadError}>
        <PageLoadProbe />
      </Viewport>
    </ViewerProvider>
  );

  return { fetchMock };
};

describe("page load state", () => {
  let getContext: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    MockResizeObserver.callback = null;
    getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: vi.fn<() => void>(),
      } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal(
      "createImageBitmap",
      vi
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ close: vi.fn<() => void>(), height: 1, width: 1 })
    );
  });

  afterEach(() => {
    getContext.mockRestore();
    vi.unstubAllGlobals();
  });

  it("reports a failed fetch with the page and the original error", async () => {
    const onPageLoadError = vi.fn<(error: PageLoadError) => void>();
    renderPageLoad({
      fetch: () => Promise.reject(new Error("offline")),
      onPageLoadError,
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });

    expect(screen.getByTestId("stage")).toHaveTextContent("fetch");
    expect(screen.getByTestId("cause")).toHaveTextContent("offline");
    expect(onPageLoadError).toHaveBeenCalledExactlyOnceWith({
      cause: new Error("offline"),
      index: 0,
      page: singlePage,
      stage: "fetch",
    });
  });

  it("reports an unsuccessful response as a fetch failure", async () => {
    const onPageLoadError = vi.fn<(error: PageLoadError) => void>();
    renderPageLoad({
      fetch: () =>
        Promise.resolve({ ok: false, status: 404, statusText: "Not Found" }),
      onPageLoadError,
    });

    await waitFor(() => {
      expect(onPageLoadError).toHaveBeenCalledWith(
        expect.objectContaining({ index: 0, stage: "fetch" })
      );
    });

    expect(screen.getByTestId("cause")).toHaveTextContent(
      "Failed to fetch page: 404 Not Found"
    );
  });

  it("reports a plugin transform failure with its stage", async () => {
    const onPageLoadError = vi.fn<(error: PageLoadError) => void>();
    renderPageLoad({
      onPageLoadError,
      plugins: [
        definePlugin({
          afterFetch: () => {
            throw new Error("decryption key missing");
          },
          name: "failing-transform",
        }),
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });

    expect(screen.getByTestId("stage")).toHaveTextContent("transform");
    expect(onPageLoadError).toHaveBeenCalledWith(
      expect.objectContaining({
        cause: new Error("decryption key missing"),
        stage: "transform",
      })
    );
  });

  it("reports a failing beforeFetch hook as a transform failure", async () => {
    const onPageLoadError = vi.fn<(error: PageLoadError) => void>();
    renderPageLoad({
      onPageLoadError,
      plugins: [
        definePlugin({
          beforeFetch: () => {
            throw new Error("no signed URL");
          },
          name: "failing-url",
        }),
      ],
    });

    await waitFor(() => {
      expect(onPageLoadError).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: new Error("no signed URL"),
          stage: "transform",
        })
      );
    });
  });

  it("reports an image that cannot be decoded", async () => {
    const decode = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error("corrupt image data"));
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: decode,
      writable: true,
    });
    const onPageLoadError = vi.fn<(error: PageLoadError) => void>();

    try {
      // Neither the bitmap decoder nor the image-element fallback can read it.
      vi.stubGlobal(
        "createImageBitmap",
        vi
          .fn<() => Promise<never>>()
          .mockRejectedValue(new Error("unsupported format"))
      );
      renderPageLoad({ onPageLoadError });

      await waitFor(() => {
        expect(screen.getByTestId("status")).toHaveTextContent("error");
      });

      expect(screen.getByTestId("stage")).toHaveTextContent("decode");
      expect(onPageLoadError).toHaveBeenCalledWith(
        expect.objectContaining({
          cause: new Error("corrupt image data"),
          stage: "decode",
        })
      );
    } finally {
      Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
    }
  });

  it("keeps the decoded placeholder visible after the full page fails", async () => {
    const onPageLoadError = vi.fn<(error: PageLoadError) => void>();
    renderPageLoad({
      fetch: (input) =>
        input === "preview.png"
          ? Promise.resolve({
              arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
              ok: true,
            })
          : Promise.reject(new Error("offline")),
      onPageLoadError,
      page: { ...singlePage, placeholder: "preview.png" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });

    expect(screen.getByTestId("placeholder")).toHaveTextContent("true");
    expect(screen.getByLabelText("Page 1")).toHaveAttribute(
      "data-placeholder",
      "true"
    );
    expect(screen.getByLabelText("Page 1")).toHaveAttribute(
      "data-page-status",
      "error"
    );
  });

  it("loads the full page even when its placeholder cannot be fetched", async () => {
    renderPageLoad({
      fetch: (input) =>
        input === "preview.png"
          ? Promise.reject(new Error("no preview"))
          : Promise.resolve({
              arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
              ok: true,
            }),
      page: { ...singlePage, placeholder: "preview.png" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("placeholder")).toHaveTextContent("false");
  });

  it("retries a failed page and clears its error once it succeeds", async () => {
    const onPageLoadError = vi.fn<(error: PageLoadError) => void>();
    const { fetchMock } = renderPageLoad({
      fetch: () => Promise.reject(new Error("offline")),
      onPageLoadError,
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });

    const failedAttempts = fetchMock.mock.calls.length;
    fetchMock.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
      ok: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("loaded");
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThan(failedAttempts);
    expect(screen.getByTestId("stage")).toHaveTextContent("none");
    expect(screen.getByLabelText("Page 1")).not.toHaveAttribute("aria-busy");
    expect(onPageLoadError).toHaveBeenCalledOnce();
  });

  it("does not reload a failed page until it is retried", async () => {
    const { fetchMock } = renderPageLoad({
      fetch: () => Promise.reject(new Error("offline")),
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });

    const failedAttempts = fetchMock.mock.calls.length;
    // Widening the viewport re-runs the loader with a fresh set of cached indices.
    act(() => {
      MockResizeObserver.trigger(900);
    });

    await waitFor(() => {
      expect(document.querySelector(".pcv-viewport")).toHaveAttribute(
        "data-view-mode",
        "double"
      );
    });

    expect(screen.getByTestId("stage")).toHaveTextContent("fetch");
    expect(fetchMock).toHaveBeenCalledTimes(failedAttempts);
  });

  it("reports pages rendered outside the managed pipeline as idle", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<MockFetch>(() => Promise.reject(new Error("should not fetch")))
    );
    render(
      <ViewerProvider pages={[singlePage]}>
        <Viewport renderPage={() => <PageLoadProbe />} />
      </ViewerProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("idle");
    });

    expect(screen.getByTestId("stage")).toHaveTextContent("none");
  });
});

describe(usePageLoadState, () => {
  it("throws when it is used outside a viewport page", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // React logs the render failure that this test asserts on.
    });

    try {
      expect(() => render(<PageLoadProbe />)).toThrow(
        "usePageLoadState must be used within a page managed by Viewport."
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
