import { act, render, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import type { PageResolveError, PageResolver } from "./page-source";
import { ViewerProvider, useViewerContext } from "./viewer-context";
import type { ViewerPage, ViewerProviderProps } from "./viewer-context";

const makePage = (index: number, token = "token"): ViewerPage => ({
  id: `p${index + 1}`,
  src: `page${index + 1}.png?${token}`,
  title: `Page ${index + 1}`,
});

// A viewer needs a page list or a page count, so the options a test varies
// are given together with one of them.
const makeWrapper = (props: ViewerProviderProps) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <ViewerProvider {...props}>{children}</ViewerProvider>;
  };

const renderViewerContext = (props: ViewerProviderProps) =>
  renderHook(() => useViewerContext(), { wrapper: makeWrapper(props) });

/** The page indices asked for, in the order the viewer asked for them. */
const resolvedIndices = (resolvePage: Mock<PageResolver>): number[] =>
  resolvePage.mock.calls.map(([index]) => index);

describe("lazy page metadata", () => {
  it("resolves only the pages within the overscan window", async () => {
    const resolvePage = vi.fn<PageResolver>((index) => makePage(index));
    const { result } = renderViewerContext({
      pageCount: 20,
      pageResolveOverscan: 2,
      resolvePage,
    });

    await waitFor(() => {
      expect(result.current.pages[2]).toBeDefined();
    });

    expect(resolvedIndices(resolvePage)).toStrictEqual([0, 1, 2]);
    expect(result.current.pageCount).toBe(20);
    expect(result.current.pages).toHaveLength(20);
    expect(result.current.pages[3]).toBeUndefined();
  });

  it("keeps the statically provided pages instead of resolving them", async () => {
    const resolvePage = vi.fn<PageResolver>((index) => makePage(index));
    const pages = [makePage(0, "static")];
    const { result } = renderViewerContext({
      pageCount: 3,
      pageResolveOverscan: 4,
      pages,
      resolvePage,
    });

    await waitFor(() => {
      expect(result.current.pages[2]).toBeDefined();
    });

    expect(resolvedIndices(resolvePage)).toStrictEqual([1, 2]);
    expect(result.current.pages[0]).toBe(pages[0]);
  });

  it("resolves a page again after it leaves the window, for a fresh URL", async () => {
    let requestCount = 0;
    const resolvePage = vi.fn<PageResolver>((index) => {
      requestCount += 1;
      return makePage(index, `token-${requestCount}`);
    });
    const { result } = renderViewerContext({
      pageCount: 20,
      pageResolveOverscan: 1,
      resolvePage,
    });

    await waitFor(() => {
      expect(result.current.pages[0]).toBeDefined();
    });

    const firstSource = result.current.pages[0]?.src;

    act(() => {
      result.current.goTo(10);
    });
    await waitFor(() => {
      expect(result.current.pages[10]).toBeDefined();
    });

    expect(result.current.pages[0]).toBeUndefined();

    act(() => {
      result.current.goTo(0);
    });
    await waitFor(() => {
      expect(result.current.pages[0]).toBeDefined();
    });

    expect(result.current.pages[0]?.src).not.toBe(firstSource);
  });

  it("keeps the metadata of a page the rail still renders", async () => {
    const resolvePage = vi.fn<PageResolver>((index) => makePage(index));
    const { result } = renderViewerContext({
      pageCount: 20,
      pageResolveOverscan: 0,
      resolvePage,
    });

    await waitFor(() => {
      expect(result.current.pages[0]).toBeDefined();
    });

    act(() => {
      result.current.goTo(3);
    });
    await waitFor(() => {
      expect(result.current.pages[3]).toBeDefined();
    });

    // The rail renders the spread a page turn leaves behind, so a page that
    // close keeps its metadata however narrow the resolve window is.
    expect(result.current.pages[0]).toBeDefined();

    act(() => {
      result.current.goTo(9);
    });
    await waitFor(() => {
      expect(result.current.pages[9]).toBeDefined();
    });

    expect(result.current.pages[0]).toBeUndefined();
  });

  it("requires a page list or a page count", () => {
    // @ts-expect-error -- A viewer given a resolver alone would hold no pages.
    const resolverOnlyProps: ViewerProviderProps = {
      resolvePage: () => {},
    };

    expect(resolverOnlyProps.pages).toBeUndefined();
  });

  it("aborts the request of a page that leaves the window", async () => {
    const signals: AbortSignal[] = [];
    const resolvePage = vi.fn<PageResolver>((_index, { signal }) => {
      signals.push(signal);
      // eslint-disable-next-line promise/avoid-new -- The request stays in flight until the viewer aborts it.
      return new Promise<ViewerPage>(() => {
        // The viewer keeps the request open until it aborts the signal.
      });
    });
    const { result } = renderViewerContext({
      pageCount: 20,
      pageResolveOverscan: 0,
      resolvePage,
    });

    await waitFor(() => {
      expect(signals).toHaveLength(1);
    });

    act(() => {
      result.current.goTo(10);
    });

    expect(signals[0].aborted).toBeTruthy();
  });

  it("reports a failed resolution once and leaves the page unresolved", async () => {
    const cause = new Error("The page metadata request failed.");
    const resolvePage = vi.fn<PageResolver>(() => Promise.reject(cause));
    const onPageResolveError = vi.fn<(error: PageResolveError) => void>();
    const { result } = renderViewerContext({
      onPageResolveError,
      pageCount: 1,
      resolvePage,
    });

    await waitFor(() => {
      expect(onPageResolveError).toHaveBeenCalledWith({ cause, index: 0 });
    });

    expect(resolvePage).toHaveBeenCalledOnce();
    expect(result.current.pages[0]).toBeUndefined();
  });

  it("counts unresolved pages in the navigation state", () => {
    const { result } = renderViewerContext({
      pageCount: 200,
      resolvePage: () => {},
    });

    expect(result.current.pageCount).toBe(200);

    act(() => {
      result.current.goTo(199);
    });

    expect(result.current.currentIndex).toBe(199);

    act(() => {
      result.current.goTo(200);
    });

    expect(result.current.currentIndex).toBe(199);
  });

  it("keeps the page list identity without a resolver", () => {
    const pages = [makePage(0), makePage(1)];
    const { result } = renderViewerContext({ pages });

    expect(result.current.pages).toBe(pages);
    expect(result.current.pageCount).toBe(2);
  });
});

describe("onEndReached", () => {
  it("is called once the reader comes within the threshold of the end", () => {
    const onEndReached = vi.fn<() => void>();
    const { result } = renderViewerContext({ onEndReached, pageCount: 10 });

    expect(onEndReached).not.toHaveBeenCalled();

    act(() => {
      result.current.goTo(7);
    });

    expect(onEndReached).toHaveBeenCalledOnce();

    act(() => {
      result.current.goTo(9);
    });

    expect(onEndReached).toHaveBeenCalledOnce();
  });

  it("is called again once the page count grows", () => {
    const onEndReached = vi.fn<() => void>();
    const { rerender } = render(
      <ViewerProvider
        currentIndex={9}
        onEndReached={onEndReached}
        pageCount={10}
      >
        <div />
      </ViewerProvider>
    );

    expect(onEndReached).toHaveBeenCalledOnce();

    rerender(
      <ViewerProvider
        currentIndex={9}
        onEndReached={onEndReached}
        pageCount={20}
      >
        <div />
      </ViewerProvider>
    );

    expect(onEndReached).toHaveBeenCalledOnce();

    rerender(
      <ViewerProvider
        currentIndex={19}
        onEndReached={onEndReached}
        pageCount={20}
      >
        <div />
      </ViewerProvider>
    );

    expect(onEndReached).toHaveBeenCalledTimes(2);
  });

  it("is not called for an empty viewer", () => {
    const onEndReached = vi.fn<() => void>();
    renderViewerContext({ onEndReached, pages: [] });

    expect(onEndReached).not.toHaveBeenCalled();
  });
});
