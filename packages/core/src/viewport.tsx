import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  ComponentPropsWithoutRef,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  ReactNode,
  TransitionEvent as ReactTransitionEvent,
} from "react";

import { runDataPipeline, runPageChangeHooks } from "./plugin";
import { useViewMode } from "./use-view-mode";
import { getVisiblePageCount, useViewerContext } from "./viewer-context";
import type { ViewerPage } from "./viewer-context";

export const getImageMimeType = (
  url: string,
  mimeType?: string
): string | undefined => {
  if (mimeType?.startsWith("image/")) {
    return mimeType;
  }

  const dataUriMatch = /^data:(?<mimeType>[^;,]+)/u.exec(url);
  if (dataUriMatch?.groups?.mimeType?.startsWith("image/")) {
    return dataUriMatch.groups.mimeType;
  }

  const extension = /\.(?<extension>[a-z0-9]+)(?:[?#]|$)/iu
    .exec(url)
    ?.groups?.extension?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    avif: "image/avif",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
  };

  return extension === undefined ? undefined : mimeTypes[extension];
};

type DecodedImage = HTMLImageElement | ImageBitmap;
interface TouchInput {
  readonly [index: number]: { clientX: number } | undefined;
  item?: (index: number) => { clientX: number } | null;
}

const getFirstTouch = (touches: TouchInput): { clientX: number } | null =>
  touches.item?.(0) ?? touches[0] ?? null;

const getImageMimeTypeOrFallback = (
  sourceUrl: string,
  mimeType?: string
): string =>
  getImageMimeType(sourceUrl, mimeType) ?? "application/octet-stream";

const decodeWithImageElement = async (
  buffer: ArrayBuffer,
  mimeType: string
): Promise<HTMLImageElement> => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 0x80_00) {
    binary += String.fromCodePoint(...bytes.subarray(offset, offset + 0x80_00));
  }

  const image = new Image();
  image.src = `data:${mimeType};base64,${btoa(binary)}`;
  await image.decode();
  return image;
};

const decodeImage = async (
  buffer: ArrayBuffer,
  sourceUrl: string,
  mimeType?: string
): Promise<DecodedImage> => {
  const imageMimeType = getImageMimeTypeOrFallback(sourceUrl, mimeType);
  const blob = new Blob([buffer], { type: imageMimeType });

  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Some browsers cannot decode every image format with createImageBitmap.
    }
  }

  return decodeWithImageElement(buffer, imageMimeType);
};

/** Releases every decoded bitmap that owns an explicit browser resource. */
const closeImageBitmaps = (images: readonly DecodedImage[]): void => {
  for (const image of images) {
    if ("close" in image) {
      image.close();
    }
  }
};

const waitForAnimationFrame = (): Promise<void> =>
  // eslint-disable-next-line promise/avoid-new -- The browser exposes a paint boundary through this callback API.
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        resolve();
      });
      return;
    }

    setTimeout(resolve, 0);
  });

/** Waits for the placeholder canvas state to reach a browser paint boundary. */
const waitForVisiblePaint = async (): Promise<void> => {
  await waitForAnimationFrame();
  await waitForAnimationFrame();
};

interface PageImage {
  bitmap: DecodedImage;
  placeholder: boolean;
}

const getPageImageKey = (index: number, page: ViewerPage): string =>
  `${index}:${page.src}`;

interface ViewportPageContextValue {
  image?: PageImage;
  page: ViewerPage;
}

const ViewportPageContext = createContext<ViewportPageContextValue | null>(
  null
);

const useViewportPageContext = (): ViewportPageContextValue => {
  const context = useContext(ViewportPageContext);
  if (context === null) {
    throw new Error(
      "PageCanvas must be rendered within a page managed by Viewport."
    );
  }

  return context;
};

export type PageCanvasProps = Omit<
  ComponentPropsWithoutRef<"canvas">,
  "aria-busy" | "aria-label" | "data-placeholder" | "height" | "width"
>;

/** Draws the decoded viewport page or its preview without exposing an image element. */
export const PageCanvas = ({ className, ...props }: PageCanvasProps) => {
  const { image: pageImage, page } = useViewportPageContext();
  const image = pageImage?.bitmap;
  const placeholder = pageImage?.placeholder ?? false;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || image === undefined) {
      return;
    }

    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }

    const imageHeight =
      "naturalHeight" in image ? image.naturalHeight : image.height;
    const imageWidth =
      "naturalWidth" in image ? image.naturalWidth : image.width;
    canvas.height = page.height ?? imageHeight;
    canvas.width = page.width ?? imageWidth;
    context.filter = placeholder ? "blur(16px)" : "none";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.filter = "none";
  }, [image, page.height, page.width, placeholder]);

  return (
    <canvas
      {...props}
      ref={canvasRef}
      aria-busy={image === undefined || undefined}
      aria-label={page.title}
      className={`pcv-page-canvas${className === undefined ? "" : ` ${className}`}`}
      data-placeholder={placeholder || undefined}
      height={page.height}
      width={page.width}
    />
  );
};

export type ViewportPageProps = ComponentPropsWithoutRef<"div">;

/** Provides the page wrapper for a Viewport page template. */
export const ViewportPage = ({
  children,
  className,
  ...props
}: ViewportPageProps) => (
  <div
    {...props}
    className={`pcv-page${className === undefined ? "" : ` ${className}`}`}
  >
    {children ?? <PageCanvas />}
  </div>
);

type ViewportChildren<TPage extends ViewerPage> =
  | ReactNode
  | ((page: TPage, index: number) => ReactNode);

export interface ViewportProps<TPage extends ViewerPage> {
  /**
   * A page template rendered for each visible page. Use ViewportPage and
   * PageCanvas to style the public page elements without private selectors.
   */
  children?: ViewportChildren<TPage>;
  renderPage?: (page: TPage, index: number) => ReactNode;
  className?: string;
  doublePageThreshold?: number;
}

interface ViewportPageInstanceProps<TPage extends ViewerPage> {
  children?: ViewportChildren<TPage>;
  image?: PageImage;
  index: number;
  page: TPage;
  renderPage?: (page: TPage, index: number) => ReactNode;
}

const ViewportPageInstance = <TPage extends ViewerPage>({
  children,
  image,
  index,
  page,
  renderPage,
}: ViewportPageInstanceProps<TPage>) => {
  const contextValue = useMemo(() => ({ image, page }), [image, page]);
  let content: ReactNode;

  if (children === undefined) {
    content =
      renderPage === undefined ? <ViewportPage /> : renderPage(page, index);
  } else {
    content = typeof children === "function" ? children(page, index) : children;
  }

  return (
    <ViewportPageContext.Provider value={contextValue}>
      {content}
    </ViewportPageContext.Provider>
  );
};

const EDGE_CLICK_RATIO = 0.3;
const MIN_SWIPE_THRESHOLD_PX = 48;
const SWIPE_THRESHOLD_RATIO = 0.12;
const INTERACTIVE_ELEMENT_SELECTOR = [
  "a[href]",
  "audio[controls]",
  "button",
  '[contenteditable]:not([contenteditable="false"])',
  "input",
  "select",
  "summary",
  "textarea",
  "video[controls]",
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="link"]',
  '[role="listbox"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
].join(", ");

const getHorizontalDirection = (key: string): "left" | "right" | undefined => {
  if (key === "ArrowLeft") {
    return "left";
  }

  return key === "ArrowRight" ? "right" : undefined;
};

export type PageTurnDirection = "left" | "right";

/** Returns the physical direction in which the current spread leaves the viewport. */
export const getPageTurnDirection = (
  fromIndex: number,
  toIndex: number,
  readingDirection: "rtl" | "ltr"
): PageTurnDirection => {
  const isForward = toIndex > fromIndex;
  return isForward === (readingDirection === "ltr") ? "left" : "right";
};

interface PageTurnTransition {
  direction: PageTurnDirection;
  id: number;
  phase: "waiting" | "prepared" | "active";
  toIndex: number;
}

const PAGE_TURN_FALLBACK_DURATION_MS = 320;
const PAGE_TURN_IMAGE_WAIT_TIMEOUT_MS = 1200;

const getVisibleIndices = (
  currentIndex: number,
  pageCount: number,
  spreadStartIndex: number,
  viewMode: "single" | "double"
): number[] => {
  const indices = currentIndex >= pageCount ? [] : [currentIndex];
  if (
    getVisiblePageCount(viewMode, currentIndex, pageCount, spreadStartIndex) ===
    2
  ) {
    indices.push(currentIndex + 1);
  }

  return indices;
};

const getNextSpreadIndex = (
  currentIndex: number,
  pageCount: number,
  spreadStartIndex: number,
  viewMode: "single" | "double"
): number | undefined => {
  const nextIndex =
    currentIndex +
    getVisiblePageCount(viewMode, currentIndex, pageCount, spreadStartIndex);
  return nextIndex < pageCount ? nextIndex : undefined;
};

const getPreviousSpreadIndex = (
  currentIndex: number,
  spreadStartIndex: number,
  viewMode: "single" | "double"
): number | undefined => {
  if (currentIndex === 0) {
    return undefined;
  }

  return Math.max(
    0,
    currentIndex -
      (viewMode === "double" && currentIndex > spreadStartIndex ? 2 : 1)
  );
};

const getRailSlotName = (slot: number): "previous" | "current" | "next" => {
  if (slot === 0) {
    return "previous";
  }

  return slot === 1 ? "current" : "next";
};

const isInteractiveTarget = (
  target: EventTarget | null,
  viewport: HTMLElement | null
): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactiveElement = target.closest(INTERACTIVE_ELEMENT_SELECTOR);
  return interactiveElement !== null && interactiveElement !== viewport;
};

export const Viewport = <TPage extends ViewerPage>({
  children,
  renderPage,
  className,
  doublePageThreshold,
}: ViewportProps<TPage>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionIdRef = useRef(0);
  const touchStateRef = useRef<{
    startX: number;
    currentX: number;
    active: boolean;
  }>({
    active: false,
    currentX: 0,
    startX: 0,
  });
  const {
    pages,
    plugins,
    currentIndex,
    readingDirection,
    spreadStartIndex,
    goToNext,
    goToPrev,
  } = useViewerContext<TPage>();
  const viewMode = useViewMode(containerRef, doublePageThreshold);
  const [pageTurnTransition, setPageTurnTransition] =
    useState<PageTurnTransition | null>(null);
  const [displayedIndex, setDisplayedIndex] = useState(currentIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pageImages, setPageImages] = useState<ReadonlyMap<string, PageImage>>(
    () => new Map()
  );
  const pageImagesRef = useRef<ReadonlyMap<string, PageImage>>(new Map());
  const cachedImageKeysRef = useRef<ReadonlySet<string>>(new Set());
  const pageLoadControllersRef = useRef(new Map<string, AbortController>());
  const retiredImageBitmapsRef = useRef<DecodedImage[]>([]);
  const usesManagedImageLoading =
    children !== undefined || renderPage === undefined;
  const usesPageRail = children === undefined && renderPage === undefined;
  const isIncomingPageSetReady =
    pageTurnTransition !== null &&
    getVisibleIndices(
      pageTurnTransition.toIndex,
      pages.length,
      spreadStartIndex,
      viewMode
    ).every((index) => {
      const page = pages[index];
      return page !== undefined && pageImages.has(getPageImageKey(index, page));
    });

  useLayoutEffect(() => {
    if (pageTurnTransition !== null || displayedIndex === currentIndex) {
      return;
    }

    const previousIndex = getPreviousSpreadIndex(
      displayedIndex,
      spreadStartIndex,
      viewMode
    );
    const nextIndex = getNextSpreadIndex(
      displayedIndex,
      pages.length,
      spreadStartIndex,
      viewMode
    );
    const isAdjacent =
      currentIndex === previousIndex || currentIndex === nextIndex;

    if (
      !usesPageRail ||
      !isAdjacent ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      // oxlint-disable-next-line react/set-state-in-effect -- Canceling a running transition must happen before the next paint.
      setPageTurnTransition(null);
      // oxlint-disable-next-line react/set-state-in-effect -- A non-adjacent programmatic change cannot use the three-spread rail.
      setDisplayedIndex(currentIndex);
      return;
    }

    transitionIdRef.current += 1;
    setPageTurnTransition({
      direction: getPageTurnDirection(
        displayedIndex,
        currentIndex,
        readingDirection
      ),
      id: transitionIdRef.current,
      phase: usesManagedImageLoading ? "waiting" : "prepared",
      toIndex: currentIndex,
    });
  }, [
    currentIndex,
    displayedIndex,
    pageTurnTransition,
    pages.length,
    readingDirection,
    spreadStartIndex,
    usesManagedImageLoading,
    usesPageRail,
    viewMode,
  ]);

  useEffect(() => {
    if (pageTurnTransition?.phase === "waiting") {
      if (!isIncomingPageSetReady) {
        // oxlint-disable-next-line react/set-state-in-effect -- Do not leave the current spread between slots while its destination is loading.
        setDragOffset(0);
        const waitTimeout = setTimeout(() => {
          setPageTurnTransition((transition) =>
            transition?.id === pageTurnTransition.id
              ? { ...transition, phase: "prepared" }
              : transition
          );
        }, PAGE_TURN_IMAGE_WAIT_TIMEOUT_MS);

        return () => {
          clearTimeout(waitTimeout);
        };
      }

      // oxlint-disable-next-line react/set-state-in-effect -- The waiting state becomes renderable only after its image cache is ready.
      setPageTurnTransition((transition) =>
        transition?.id === pageTurnTransition.id
          ? { ...transition, phase: "prepared" }
          : transition
      );
      return;
    }

    if (pageTurnTransition?.phase !== "prepared") {
      return;
    }

    const requestFrame =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : // oxlint-disable-next-line promise/prefer-await-to-callbacks -- This is the browser's frame callback API fallback.
          (callback: FrameRequestCallback) =>
            setTimeout(callback, 0) as unknown as number;
    const cancelFrame =
      typeof cancelAnimationFrame === "function"
        ? cancelAnimationFrame
        : clearTimeout;
    const animationFrame = requestFrame(() => {
      setDragOffset(0);
      setPageTurnTransition((transition) =>
        transition?.id === pageTurnTransition.id
          ? { ...transition, phase: "active" }
          : transition
      );
    });

    return () => {
      cancelFrame(animationFrame);
    };
  }, [isIncomingPageSetReady, pageTurnTransition]);

  useEffect(() => {
    if (pageTurnTransition?.phase !== "active") {
      return;
    }

    const transitionId = pageTurnTransition.id;
    const timeout = setTimeout(() => {
      setDisplayedIndex(pageTurnTransition.toIndex);
      setPageTurnTransition((transition) =>
        transition?.id === transitionId ? null : transition
      );
    }, PAGE_TURN_FALLBACK_DURATION_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [pageTurnTransition]);

  const goByHorizontalDirection = useCallback(
    (direction: "left" | "right"): void => {
      if (direction === "left") {
        if (readingDirection === "rtl") {
          goToNext();
        } else {
          goToPrev();
        }
        return;
      }

      if (readingDirection === "rtl") {
        goToPrev();
      } else {
        goToNext();
      }
    },
    [goToNext, goToPrev, readingDirection]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const direction = getHorizontalDirection(event.key);
      if (
        direction === undefined ||
        isInteractiveTarget(event.target, containerRef.current)
      ) {
        return;
      }

      event.preventDefault();
      goByHorizontalDirection(direction);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [goByHorizontalDirection]);

  const handleEdgeClick = (event: MouseEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const edgeWidth = rect.width * EDGE_CLICK_RATIO;

    if (offsetX <= edgeWidth) {
      goByHorizontalDirection("left");
      return;
    }

    if (offsetX >= rect.width - edgeWidth) {
      goByHorizontalDirection("right");
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const direction = getHorizontalDirection(event.key);
    if (
      direction === undefined ||
      isInteractiveTarget(event.target, event.currentTarget)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    goByHorizontalDirection(direction);
  };

  const beginTouch = useCallback(
    (touches: TouchInput): void => {
      if (pageTurnTransition !== null) {
        return;
      }

      const touch = getFirstTouch(touches);
      if (touch === null) {
        return;
      }

      touchStateRef.current = {
        active: true,
        currentX: touch.clientX,
        startX: touch.clientX,
      };
      setIsDragging(usesPageRail);
    },
    [pageTurnTransition, usesPageRail]
  );

  const moveTouch = useCallback(
    (touches: TouchInput): void => {
      if (!touchStateRef.current.active) {
        return;
      }

      const touch = getFirstTouch(touches);
      if (touch === null) {
        return;
      }

      touchStateRef.current.currentX = touch.clientX;
      if (usesPageRail) {
        const offset =
          touchStateRef.current.currentX - touchStateRef.current.startX;
        const containerWidth = containerRef.current?.clientWidth ?? 0;
        setDragOffset(
          containerWidth === 0
            ? offset
            : Math.max(-containerWidth, Math.min(containerWidth, offset))
        );
      }
    },
    [usesPageRail]
  );

  const endTouch = useCallback((): void => {
    if (!touchStateRef.current.active) {
      return;
    }

    const containerWidth = containerRef.current?.clientWidth ?? 0;
    const threshold = Math.max(
      MIN_SWIPE_THRESHOLD_PX,
      containerWidth * SWIPE_THRESHOLD_RATIO
    );
    const deltaX =
      touchStateRef.current.currentX - touchStateRef.current.startX;

    touchStateRef.current.active = false;
    setIsDragging(false);

    if (Math.abs(deltaX) < threshold) {
      setDragOffset(0);
      return;
    }

    const direction = deltaX > 0 ? "left" : "right";
    let targetIndex: number | undefined;
    if (direction === "left") {
      targetIndex =
        readingDirection === "rtl"
          ? getNextSpreadIndex(
              displayedIndex,
              pages.length,
              spreadStartIndex,
              viewMode
            )
          : getPreviousSpreadIndex(displayedIndex, spreadStartIndex, viewMode);
    } else {
      targetIndex =
        readingDirection === "rtl"
          ? getPreviousSpreadIndex(displayedIndex, spreadStartIndex, viewMode)
          : getNextSpreadIndex(
              displayedIndex,
              pages.length,
              spreadStartIndex,
              viewMode
            );
    }

    if (targetIndex === undefined) {
      setDragOffset(0);
      return;
    }

    setDragOffset(0);
    goByHorizontalDirection(direction);
  }, [
    displayedIndex,
    goByHorizontalDirection,
    pages.length,
    readingDirection,
    spreadStartIndex,
    viewMode,
  ]);

  const cancelTouch = useCallback((): void => {
    if (!touchStateRef.current.active) {
      return;
    }

    touchStateRef.current.active = false;
    setDragOffset(0);
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const root = containerRef.current?.closest(".pcv-root");
    if (root === null || root === undefined) {
      return;
    }

    const originatesOnProgressTrigger = (target: EventTarget | null): boolean =>
      target instanceof Element &&
      target.closest(".pcv-page-progress-trigger") !== null;
    const getTouches = (event: Event): TouchInput =>
      (event as unknown as { touches: TouchInput }).touches;
    const onTouchStart = (event: Event): void => {
      if (originatesOnProgressTrigger(event.target)) {
        event.stopPropagation();
        beginTouch(getTouches(event));
      }
    };
    const onTouchMove = (event: Event): void => {
      if (touchStateRef.current.active) {
        event.stopPropagation();
        moveTouch(getTouches(event));
        if (
          Math.abs(
            touchStateRef.current.currentX - touchStateRef.current.startX
          ) >= MIN_SWIPE_THRESHOLD_PX &&
          event.cancelable
        ) {
          event.preventDefault();
        }
      }
    };
    const onTouchEnd = (event: Event): void => {
      if (touchStateRef.current.active) {
        event.stopPropagation();
        endTouch();
      }
    };
    const onTouchCancel = (event: Event): void => {
      if (touchStateRef.current.active) {
        event.stopPropagation();
        cancelTouch();
      }
    };

    root.addEventListener("touchstart", onTouchStart);
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", onTouchEnd);
    root.addEventListener("touchcancel", onTouchCancel);

    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [beginTouch, cancelTouch, endTouch, moveTouch]);

  const visibleIndices = useMemo(
    () =>
      getVisibleIndices(
        displayedIndex,
        pages.length,
        spreadStartIndex,
        viewMode
      ),
    [displayedIndex, pages.length, spreadStartIndex, viewMode]
  );

  // In RTL mode the next page visually appears on the left side
  const orderedIndices = useMemo(
    () =>
      readingDirection === "rtl" && visibleIndices.length === 2
        ? [visibleIndices[1], visibleIndices[0]]
        : visibleIndices,
    [readingDirection, visibleIndices]
  );

  const orderedIndicesFor = useCallback(
    (index: number): number[] => {
      const indices = getVisibleIndices(
        index,
        pages.length,
        spreadStartIndex,
        viewMode
      );
      return readingDirection === "rtl" && indices.length === 2
        ? [indices[1], indices[0]]
        : indices;
    },
    [pages.length, readingDirection, spreadStartIndex, viewMode]
  );

  const transitionToIndex = pageTurnTransition?.toIndex;
  const previousSpreadIndex = getPreviousSpreadIndex(
    displayedIndex,
    spreadStartIndex,
    viewMode
  );
  const nextSpreadIndex = getNextSpreadIndex(
    displayedIndex,
    pages.length,
    spreadStartIndex,
    viewMode
  );
  const railSpreadIndices = useMemo(() => {
    if (usesPageRail) {
      return readingDirection === "rtl"
        ? [nextSpreadIndex, displayedIndex, previousSpreadIndex]
        : [previousSpreadIndex, displayedIndex, nextSpreadIndex];
    }

    return [undefined, displayedIndex, undefined];
  }, [
    displayedIndex,
    nextSpreadIndex,
    previousSpreadIndex,
    readingDirection,
    usesPageRail,
  ]);
  const cachedIndices = useMemo(() => {
    const indices = new Set<number>();

    for (const spreadIndex of railSpreadIndices) {
      if (spreadIndex === undefined) {
        continue;
      }

      for (const pageIndex of getVisibleIndices(
        spreadIndex,
        pages.length,
        spreadStartIndex,
        viewMode
      )) {
        indices.add(pageIndex);
      }
    }

    if (transitionToIndex !== undefined) {
      for (const pageIndex of getVisibleIndices(
        transitionToIndex,
        pages.length,
        spreadStartIndex,
        viewMode
      )) {
        indices.add(pageIndex);
      }
    }

    if (!usesPageRail) {
      let nextIndex = getNextSpreadIndex(
        displayedIndex,
        pages.length,
        spreadStartIndex,
        viewMode
      );
      if (nextIndex !== undefined) {
        for (const pageIndex of getVisibleIndices(
          nextIndex,
          pages.length,
          spreadStartIndex,
          viewMode
        )) {
          indices.add(pageIndex);
        }
        nextIndex = getNextSpreadIndex(
          nextIndex,
          pages.length,
          spreadStartIndex,
          viewMode
        );
        if (nextIndex !== undefined) {
          for (const pageIndex of getVisibleIndices(
            nextIndex,
            pages.length,
            spreadStartIndex,
            viewMode
          )) {
            indices.add(pageIndex);
          }
        }
      }
    }

    return [...indices];
  }, [
    displayedIndex,
    pages.length,
    railSpreadIndices,
    spreadStartIndex,
    transitionToIndex,
    usesPageRail,
    viewMode,
  ]);

  const handleTransitionEnd = useCallback(
    (id: number, event: ReactTransitionEvent<HTMLDivElement>): void => {
      if (
        event.target !== event.currentTarget ||
        event.propertyName !== "transform"
      ) {
        return;
      }

      setPageTurnTransition((transition) =>
        transition?.id === id ? null : transition
      );
      if (pageTurnTransition?.id === id) {
        setDisplayedIndex(pageTurnTransition.toIndex);
      }
    },
    [pageTurnTransition]
  );

  useEffect(() => {
    const notifyPageChange = async (): Promise<void> => {
      try {
        await runPageChangeHooks(plugins, currentIndex, pages.length);
      } catch {
        // Page-change reporting must not make the viewer unusable.
      }
    };

    void notifyPageChange();
  }, [currentIndex, pages.length, plugins]);

  useEffect(() => {
    if (!usesManagedImageLoading) {
      return;
    }

    const requestedImageKeys = new Set(
      cachedIndices.flatMap((index) => {
        const page = pages[index];
        return page === undefined ? [] : [getPageImageKey(index, page)];
      })
    );
    cachedImageKeysRef.current = requestedImageKeys;
    const setPageImage = (index: number, image: PageImage): boolean => {
      const page = pages[index];
      if (page === undefined) {
        closeImageBitmaps([image.bitmap]);
        return false;
      }

      const imageKey = getPageImageKey(index, page);
      if (!cachedImageKeysRef.current.has(imageKey)) {
        closeImageBitmaps([image.bitmap]);
        return false;
      }

      const previousImage = pageImagesRef.current.get(imageKey);
      if (previousImage !== undefined && previousImage !== image) {
        retiredImageBitmapsRef.current.push(previousImage.bitmap);
      }

      const nextImages = new Map([
        ...pageImagesRef.current.entries(),
        [imageKey, image],
      ]);
      pageImagesRef.current = nextImages;
      setPageImages(nextImages);
      return true;
    };

    const loadPage = async (index: number): Promise<void> => {
      const page = pages[index];
      if (page === undefined) {
        return;
      }

      const imageKey = getPageImageKey(index, page);
      if (pageImagesRef.current.has(imageKey)) {
        return;
      }

      if (pageLoadControllersRef.current.has(imageKey)) {
        return;
      }

      const abortController = new AbortController();
      pageLoadControllersRef.current.set(imageKey, abortController);
      const releasePageLoad = (): void => {
        if (pageLoadControllersRef.current.get(imageKey) === abortController) {
          pageLoadControllersRef.current.delete(imageKey);
        }
      };

      try {
        const bufferPromise = (async (): Promise<ArrayBuffer | undefined> => {
          try {
            return await runDataPipeline(
              page.src,
              plugins,
              abortController.signal
            );
          } catch {
            return undefined;
          }
        })();

        if (page.placeholder !== undefined) {
          const placeholderBuffer = await runDataPipeline(
            page.placeholder,
            [],
            abortController.signal
          );
          const placeholderBitmap = await decodeImage(
            placeholderBuffer,
            page.placeholder
          );
          if (
            !setPageImage(index, {
              bitmap: placeholderBitmap,
              placeholder: true,
            })
          ) {
            releasePageLoad();
            return;
          }
          await waitForVisiblePaint();
        }

        const buffer = await bufferPromise;
        if (buffer === undefined) {
          releasePageLoad();
          return;
        }
        const bitmap = await decodeImage(buffer, page.src, page.mimeType);
        setPageImage(index, { bitmap, placeholder: false });
      } catch {
        // Keep a decoded placeholder visible when the full page cannot load.
      }
      releasePageLoad();
    };

    void Promise.all(cachedIndices.map(loadPage));
  }, [cachedIndices, pages, plugins, usesManagedImageLoading]);

  useEffect(() => {
    if (!usesManagedImageLoading || pageTurnTransition !== null) {
      return;
    }

    const retainedImageKeys = new Set(
      cachedIndices.flatMap((index) => {
        const page = pages[index];
        return page === undefined ? [] : [getPageImageKey(index, page)];
      })
    );
    const nextImages = new Map(pageImagesRef.current);
    const expiredImages: DecodedImage[] = [];

    for (const [key, image] of nextImages) {
      if (!retainedImageKeys.has(key)) {
        expiredImages.push(image.bitmap);
        nextImages.delete(key);
      }
    }

    for (const [key, controller] of pageLoadControllersRef.current) {
      if (!retainedImageKeys.has(key)) {
        controller.abort();
        pageLoadControllersRef.current.delete(key);
      }
    }

    if (expiredImages.length > 0) {
      closeImageBitmaps(expiredImages);
      pageImagesRef.current = nextImages;
      // oxlint-disable-next-line react/set-state-in-effect -- Pages are evicted only after their transition DOM has unmounted.
      setPageImages(nextImages);
    }

    if (retiredImageBitmapsRef.current.length > 0) {
      closeImageBitmaps(retiredImageBitmapsRef.current);
      retiredImageBitmapsRef.current = [];
    }
  }, [cachedIndices, pageTurnTransition, pages, usesManagedImageLoading]);

  useEffect(
    () => () => {
      for (const controller of pageLoadControllersRef.current.values()) {
        controller.abort();
      }
      pageLoadControllersRef.current.clear();
      closeImageBitmaps([
        ...[...pageImagesRef.current.values()].map((image) => image.bitmap),
        ...retiredImageBitmapsRef.current,
      ]);
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className={`pcv-viewport${className === undefined ? "" : ` ${className}`}`}
      data-reading-direction={readingDirection}
      data-slide-direction={pageTurnTransition?.direction}
      data-transition-state={pageTurnTransition?.phase ?? "idle"}
      data-view-mode={viewMode}
      data-page-count={orderedIndices.length}
      data-dragging={isDragging || undefined}
      onClick={handleEdgeClick}
      onKeyDown={handleKeyDown}
      onTouchStart={(event) => {
        event.stopPropagation();
        beginTouch(event.touches);
      }}
      onTouchMove={(event) => {
        event.stopPropagation();
        moveTouch(event.touches);
      }}
      onTouchEnd={(event) => {
        event.stopPropagation();
        endTouch();
      }}
      onTouchCancel={(event) => {
        event.stopPropagation();
        cancelTouch();
      }}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The viewer is a composite widget, not a button.
      role="button"
      tabIndex={0}
    >
      <div
        className="pcv-viewport-track"
        style={{ "--pcv-drag-offset": `${dragOffset}px` } as CSSProperties}
        onTransitionEnd={
          pageTurnTransition?.phase === "active"
            ? (event) => handleTransitionEnd(pageTurnTransition.id, event)
            : undefined
        }
      >
        {railSpreadIndices.map((spreadIndex, slot) => (
          <div
            key={slot}
            aria-hidden={slot !== 1 || undefined}
            className="pcv-viewport-page-set"
            data-page-count={
              spreadIndex === undefined
                ? 0
                : orderedIndicesFor(spreadIndex).length
            }
            data-reading-direction={readingDirection}
            data-rail-slot={getRailSlotName(slot)}
          >
            {spreadIndex === undefined
              ? null
              : orderedIndicesFor(spreadIndex).map((index) => {
                  const page = pages[index];
                  if (page === undefined) {
                    return null;
                  }

                  return (
                    <ViewportPageInstance
                      key={index}
                      image={pageImages.get(getPageImageKey(index, page))}
                      index={index}
                      page={page}
                      renderPage={renderPage}
                    >
                      {children}
                    </ViewportPageInstance>
                  );
                })}
          </div>
        ))}
      </div>
    </div>
  );
};
