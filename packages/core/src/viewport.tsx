import {
  createContext,
  cloneElement,
  isValidElement,
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
  ReactElement,
  ReactNode,
  TransitionEvent as ReactTransitionEvent,
} from "react";

import { runPageChangeHooks } from "./plugin";
import { useViewMode } from "./use-view-mode";
import { getPageImageKey, useViewportImages } from "./use-viewport-images";
import type { PageImage } from "./use-viewport-images";
import {
  getNextSpreadIndex,
  getPageTurnDirection,
  getPreviousSpreadIndex,
  getSwipeTargetIndex,
  getVisibleIndices,
  useViewportLayout,
} from "./use-viewport-layout";
import type { PageTurnDirection } from "./use-viewport-layout";
import { useViewerContext } from "./viewer-context";
import type { ViewerPage } from "./viewer-context";

export { getImageMimeType } from "./use-viewport-images";
export { getPageTurnDirection } from "./use-viewport-layout";
export type { PageTurnDirection } from "./use-viewport-layout";

interface TouchInput {
  readonly [index: number]: { clientX: number; clientY: number } | undefined;
  item?: (index: number) => { clientX: number; clientY: number } | null;
}

const getFirstTouch = (
  touches: TouchInput
): { clientX: number; clientY: number } | null =>
  touches.item?.(0) ?? touches[0] ?? null;

const getTouchPair = (
  touches: TouchInput
):
  | [{ clientX: number; clientY: number }, { clientX: number; clientY: number }]
  | null => {
  const first = getFirstTouch(touches);
  const second = touches.item?.(1) ?? touches[1] ?? null;
  return first === null || second === null ? null : [first, second];
};

const getTouchDistance = (
  first: { clientX: number; clientY: number },
  second: { clientX: number; clientY: number }
): number =>
  Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);

const getTouchCenter = (
  first: { clientX: number; clientY: number },
  second: { clientX: number; clientY: number }
): { x: number; y: number } => ({
  x: (first.clientX + second.clientX) / 2,
  y: (first.clientY + second.clientY) / 2,
});

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

export interface ViewportTrackProps extends ComponentPropsWithoutRef<"div"> {
  "data-dragging"?: boolean;
  "data-slide-direction"?: PageTurnDirection;
  "data-transition-state"?: "idle" | "waiting" | "prepared" | "active";
}

/** Provides the page-turn rail for a custom Viewport layout. */
export const ViewportTrack = ({
  children,
  className,
  ...props
}: ViewportTrackProps) => (
  <div
    {...props}
    className={`pcv-viewport-track${className === undefined ? "" : ` ${className}`}`}
  >
    {children}
  </div>
);

export interface ViewportPageSetProps extends ComponentPropsWithoutRef<"div"> {
  "data-page-count"?: number;
  "data-rail-slot"?: "previous" | "current" | "next";
  "data-reading-direction"?: "rtl" | "ltr";
  "data-view-mode"?: "single" | "double";
}

/** Provides one rail slot for a custom Viewport layout. */
export const ViewportPageSet = ({
  children,
  className,
  ...props
}: ViewportPageSetProps) => (
  <div
    {...props}
    className={`pcv-viewport-page-set${className === undefined ? "" : ` ${className}`}`}
  >
    {children}
  </div>
);

export interface ViewportPageSlotProps extends ComponentPropsWithoutRef<"div"> {
  "data-view-mode"?: "single" | "double";
}

/** Provides one visible page slot for a custom Viewport layout. */
export const ViewportPageSlot = ({
  children,
  className,
  ...props
}: ViewportPageSlotProps) => (
  <div
    {...props}
    className={`pcv-viewport-page-slot${className === undefined ? "" : ` ${className}`}`}
  >
    {children}
  </div>
);

type ViewportChildren<TPage extends ViewerPage> =
  | ReactNode
  | ((page: TPage, index: number) => ReactNode);

interface ViewportLayoutTemplate<TPage extends ViewerPage> {
  pageSet: ReactElement<ViewportPageSetProps>;
  pageSlot: ReactElement<ViewportPageSlotProps>;
  pageTemplate: ViewportChildren<TPage> | undefined;
  track: ReactElement<ViewportTrackProps>;
}

const getViewportLayoutTemplate = <TPage extends ViewerPage>(
  children: ViewportChildren<TPage> | undefined
): ViewportLayoutTemplate<TPage> | undefined => {
  if (
    !isValidElement<ViewportTrackProps>(children) ||
    children.type !== ViewportTrack
  ) {
    return undefined;
  }

  const pageSet = children.props.children;
  if (
    !isValidElement<ViewportPageSetProps>(pageSet) ||
    pageSet.type !== ViewportPageSet
  ) {
    throw new Error(
      "ViewportTrack must contain exactly one ViewportPageSet template."
    );
  }

  const pageSlot = pageSet.props.children;
  if (
    !isValidElement<ViewportPageSlotProps>(pageSlot) ||
    pageSlot.type !== ViewportPageSlot
  ) {
    throw new Error(
      "ViewportPageSet must contain exactly one ViewportPageSlot template."
    );
  }

  return {
    pageSet,
    pageSlot,
    pageTemplate: pageSlot.props.children as
      | ViewportChildren<TPage>
      | undefined,
    track: children,
  };
};

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
const MAX_ZOOM_SCALE = 4;
const MIN_ZOOM_SCALE = 0.5;
const DOUBLE_TAP_DELAY_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 24;
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

interface PageTurnTransition {
  direction: PageTurnDirection;
  id: number;
  phase: "waiting" | "prepared" | "active";
  toIndex: number;
}

const PAGE_TURN_FALLBACK_DURATION_MS = 320;
const PAGE_TURN_IMAGE_WAIT_TIMEOUT_MS = 1200;

const getRailSlotName = (slot: number): "previous" | "current" | "next" => {
  if (slot === 0) {
    return "previous";
  }

  return slot === 1 ? "current" : "next";
};

interface ViewportRailProps<TPage extends ViewerPage> {
  activePan: { x: number; y: number };
  activeZoom: { scale: number };
  dragOffset: number;
  getPageIndices: (spreadIndex: number) => number[];
  isDragging: boolean;
  layoutTemplate: ViewportLayoutTemplate<TPage> | undefined;
  onTransitionEnd:
    | ((event: ReactTransitionEvent<HTMLDivElement>) => void)
    | undefined;
  pageImages: ReadonlyMap<string, PageImage>;
  pageTemplate: ViewportChildren<TPage> | undefined;
  pages: readonly TPage[];
  pageTurnTransition: PageTurnTransition | null;
  railSpreadIndices: readonly (number | undefined)[];
  readingDirection: "rtl" | "ltr";
  renderPage: ((page: TPage, index: number) => ReactNode) | undefined;
  viewMode: "single" | "double";
}

const ViewportRail = <TPage extends ViewerPage>({
  activePan,
  activeZoom,
  dragOffset,
  getPageIndices,
  isDragging,
  layoutTemplate,
  onTransitionEnd,
  pageImages,
  pageTemplate,
  pages,
  pageTurnTransition,
  railSpreadIndices,
  readingDirection,
  renderPage,
  viewMode,
}: ViewportRailProps<TPage>) => {
  const trackTemplate = layoutTemplate?.track;
  const pageSetTemplate = layoutTemplate?.pageSet;
  const pageSlotTemplate = layoutTemplate?.pageSlot;
  const pageSets = railSpreadIndices.map((spreadIndex, slot) => {
    const pageSetStyle =
      slot === 1
        ? ({
            ...pageSetTemplate?.props.style,
            "--pcv-pan-x": `${activePan.x}px`,
            "--pcv-pan-y": `${activePan.y}px`,
            "--pcv-zoom-scale": activeZoom.scale,
          } as CSSProperties)
        : pageSetTemplate?.props.style;
    const pageSetProps = {
      "aria-hidden": slot !== 1 || undefined,
      "data-page-count":
        spreadIndex === undefined ? 0 : getPageIndices(spreadIndex).length,
      "data-rail-slot": getRailSlotName(slot),
      "data-reading-direction": readingDirection,
      "data-view-mode": viewMode,
      style: pageSetStyle,
    };
    const pageInstances =
      spreadIndex === undefined
        ? null
        : getPageIndices(spreadIndex).map((index) => {
            const page = pages[index];
            if (page === undefined) {
              return null;
            }

            const pageInstance = (
              <ViewportPageInstance
                key={index}
                image={pageImages.get(getPageImageKey(index, page))}
                index={index}
                page={page}
                renderPage={renderPage}
              >
                {pageTemplate}
              </ViewportPageInstance>
            );

            if (pageSlotTemplate === undefined) {
              return pageInstance;
            }

            // oxlint-disable-next-line react/no-clone-element -- The page slot is a public layout template instantiated for each visible page.
            return cloneElement(
              pageSlotTemplate,
              { "data-view-mode": viewMode, key: index },
              pageInstance
            );
          });

    if (pageSetTemplate === undefined) {
      return (
        <ViewportPageSet key={slot} {...pageSetProps}>
          {pageInstances}
        </ViewportPageSet>
      );
    }

    // oxlint-disable-next-line react/no-clone-element -- The page set is a public layout template instantiated for each rail slot.
    return cloneElement(
      pageSetTemplate,
      { ...pageSetProps, key: slot },
      pageInstances
    );
  });
  const trackStyle = {
    ...trackTemplate?.props.style,
    "--pcv-drag-offset": `${dragOffset}px`,
  } as CSSProperties;
  const trackProps: Partial<ViewportTrackProps> = {
    "data-dragging": isDragging || undefined,
    "data-slide-direction": pageTurnTransition?.direction,
    "data-transition-state": pageTurnTransition?.phase ?? "idle",
    onTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => {
      trackTemplate?.props.onTransitionEnd?.(event);
      onTransitionEnd?.(event);
    },
    style: trackStyle,
  };

  if (trackTemplate === undefined) {
    return <ViewportTrack {...trackProps}>{pageSets}</ViewportTrack>;
  }

  // oxlint-disable-next-line react/no-clone-element -- The track is a public layout template filled by the managed rail.
  return cloneElement(trackTemplate, trackProps, pageSets);
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
  const layoutTemplate = getViewportLayoutTemplate(children);
  const pageTemplate =
    layoutTemplate === undefined ? children : layoutTemplate.pageTemplate;
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionIdRef = useRef(0);
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  }>({
    active: false,
    currentX: 0,
    currentY: 0,
    startX: 0,
    startY: 0,
  });
  const panStateRef = useRef<{
    pointerId: number | "touch" | null;
    startPanX: number;
    startPanY: number;
    startX: number;
    startY: number;
  }>({
    pointerId: null,
    startPanX: 0,
    startPanY: 0,
    startX: 0,
    startY: 0,
  });
  const didPanRef = useRef(false);
  const pinchStateRef = useRef<{
    startCenterX: number;
    startCenterY: number;
    startDistance: number;
    startPanX: number;
    startPanY: number;
    startScale: number;
  } | null>(null);
  const lastTapRef = useRef<{
    key: string;
    time: number;
    x: number;
    y: number;
  } | null>(null);
  const {
    pages,
    plugins,
    currentIndex,
    pageFitMode,
    readingDirection,
    spreadStartIndex,
    goToNext,
    goToPrev,
    setPageFitMode,
  } = useViewerContext<TPage>();
  const viewMode = useViewMode(containerRef, doublePageThreshold);
  const [pageTurnTransition, setPageTurnTransition] =
    useState<PageTurnTransition | null>(null);
  const [displayedIndex, setDisplayedIndex] = useState(currentIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [panningKey, setPanningKey] = useState<string | null>(null);
  const [pan, setPan] = useState({ key: "", x: 0, y: 0 });
  const [zoom, setZoom] = useState({ key: "", scale: 1 });
  const usesManagedImageLoading =
    children !== undefined || renderPage === undefined;
  const usesPageRail =
    (children === undefined || layoutTemplate !== undefined) &&
    renderPage === undefined;
  const panKey = `${currentIndex}:${pageFitMode}`;
  const activePan = pan.key === panKey ? pan : { x: 0, y: 0 };
  const activeZoom = zoom.key === panKey ? zoom : { scale: 1 };
  // Actual-size can exceed the viewport. A pinch may also zoom any fit mode
  // beyond its initial size. Fit-to-width remains swipeable after a double tap.
  const isPannable = pageFitMode === "actual" || activeZoom.scale > 1;
  const {
    cachedIndices,
    orderedIndices,
    orderedIndicesFor,
    railSpreadIndices,
  } = useViewportLayout({
    displayedIndex,
    pageCount: pages.length,
    readingDirection,
    spreadStartIndex,
    transitionToIndex: pageTurnTransition?.toIndex,
    usesPageRail,
    viewMode,
  });
  const pageImages = useViewportImages({
    cachedIndices,
    keepImages: pageTurnTransition !== null,
    pages,
    plugins,
    shouldLoadImages: usesManagedImageLoading,
  });
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
      // oxlint-disable-next-line react/set-state-in-effect -- A transition that cannot run must restore the rail to its resting position before paint.
      setDragOffset(0);
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

  const getPanLimits = useCallback((scale: number) => {
    const viewport = containerRef.current;
    const currentPageSet = viewport?.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );
    if (viewport === null || viewport === undefined) {
      return { x: 0, y: 0 };
    }
    if (currentPageSet === null || currentPageSet === undefined) {
      return { x: 0, y: 0 };
    }

    return {
      x: Math.max(
        0,
        (currentPageSet.scrollWidth * scale - viewport.clientWidth) / 2
      ),
      y: Math.max(
        0,
        (currentPageSet.scrollHeight * scale - viewport.clientHeight) / 2
      ),
    };
  }, []);

  const updatePan = useCallback(
    (x: number, y: number, scale: number): void => {
      const limits = getPanLimits(scale);
      setPan({
        key: panKey,
        x: Math.max(-limits.x, Math.min(limits.x, x)),
        y: Math.max(-limits.y, Math.min(limits.y, y)),
      });
    },
    [getPanLimits, panKey]
  );

  const beginPan = useCallback(
    (pointerId: number | "touch", clientX: number, clientY: number): void => {
      if (!isPannable || panStateRef.current.pointerId !== null) {
        return;
      }

      didPanRef.current = false;
      panStateRef.current = {
        pointerId,
        startPanX: activePan.x,
        startPanY: activePan.y,
        startX: clientX,
        startY: clientY,
      };
      setPanningKey(panKey);
    },
    [activePan.x, activePan.y, isPannable, panKey]
  );

  const movePan = useCallback(
    (
      pointerId: number | "touch",
      clientX: number,
      clientY: number
    ): boolean => {
      const panState = panStateRef.current;
      if (panState.pointerId !== pointerId) {
        return false;
      }

      const deltaX = clientX - panState.startX;
      const deltaY = clientY - panState.startY;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        didPanRef.current = true;
      }
      updatePan(
        panState.startPanX + deltaX,
        panState.startPanY + deltaY,
        activeZoom.scale
      );
      return true;
    },
    [activeZoom.scale, updatePan]
  );

  const endPan = useCallback((pointerId: number | "touch"): void => {
    if (panStateRef.current.pointerId !== pointerId) {
      return;
    }

    panStateRef.current.pointerId = null;
    setPanningKey(null);
  }, []);

  const resetToFitWidth = useCallback((): void => {
    const widthPanKey = `${currentIndex}:width`;
    didPanRef.current = true;
    pinchStateRef.current = null;
    setPageFitMode("width");
    setPan({ key: widthPanKey, x: 0, y: 0 });
    setPanningKey(null);
    setZoom({ key: widthPanKey, scale: 1 });
  }, [currentIndex, setPageFitMode]);

  const registerTap = useCallback(
    (clientX: number, clientY: number): void => {
      const now = Date.now();
      const previousTap = lastTapRef.current;
      if (
        previousTap !== null &&
        previousTap.key === panKey &&
        now - previousTap.time <= DOUBLE_TAP_DELAY_MS &&
        Math.hypot(clientX - previousTap.x, clientY - previousTap.y) <=
          DOUBLE_TAP_DISTANCE_PX
      ) {
        lastTapRef.current = null;
        resetToFitWidth();
        return;
      }

      lastTapRef.current = { key: panKey, time: now, x: clientX, y: clientY };
    },
    [panKey, resetToFitWidth]
  );

  const beginPinch = useCallback(
    (touches: TouchInput): boolean => {
      const pair = getTouchPair(touches);
      if (pair === null) {
        return false;
      }

      const [first, second] = pair;
      const startDistance = getTouchDistance(first, second);
      if (startDistance === 0) {
        return false;
      }

      const center = getTouchCenter(first, second);
      didPanRef.current = false;
      pinchStateRef.current = {
        startCenterX: center.x,
        startCenterY: center.y,
        startDistance,
        startPanX: activePan.x,
        startPanY: activePan.y,
        startScale: activeZoom.scale,
      };
      panStateRef.current.pointerId = null;
      touchStateRef.current.active = false;
      setIsDragging(false);
      setPanningKey(panKey);
      return true;
    },
    [activePan.x, activePan.y, activeZoom.scale, panKey]
  );

  const movePinch = useCallback(
    (touches: TouchInput): boolean => {
      const pinchState = pinchStateRef.current;
      const pair = getTouchPair(touches);
      if (pinchState === null || pair === null) {
        return false;
      }

      const [first, second] = pair;
      const distance = getTouchDistance(first, second);
      const center = getTouchCenter(first, second);
      const scale = Math.max(
        MIN_ZOOM_SCALE,
        Math.min(
          MAX_ZOOM_SCALE,
          pinchState.startScale * (distance / pinchState.startDistance)
        )
      );
      if (
        Math.abs(center.x - pinchState.startCenterX) > 2 ||
        Math.abs(center.y - pinchState.startCenterY) > 2 ||
        Math.abs(scale - pinchState.startScale) > 0.01
      ) {
        didPanRef.current = true;
      }
      setZoom({ key: panKey, scale });
      updatePan(
        pinchState.startPanX + center.x - pinchState.startCenterX,
        pinchState.startPanY + center.y - pinchState.startCenterY,
        scale
      );
      return true;
    },
    [panKey, updatePan]
  );

  const endPinch = useCallback((): void => {
    if (pinchStateRef.current === null) {
      return;
    }

    pinchStateRef.current = null;
    setPanningKey(null);
  }, []);

  const handleEdgeClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }
    if (isPannable) {
      return;
    }
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

      if (beginPinch(touches)) {
        return;
      }

      const touch = getFirstTouch(touches);
      if (touch === null) {
        return;
      }

      if (isPannable) {
        beginPan("touch", touch.clientX, touch.clientY);
        return;
      }

      touchStateRef.current = {
        active: true,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
      };
      setIsDragging(usesPageRail);
    },
    [beginPan, beginPinch, isPannable, pageTurnTransition, usesPageRail]
  );

  const moveTouch = useCallback(
    (touches: TouchInput): void => {
      if (movePinch(touches)) {
        return;
      }
      const touch = getFirstTouch(touches);
      if (touch === null) {
        return;
      }

      if (movePan("touch", touch.clientX, touch.clientY)) {
        return;
      }
      if (!touchStateRef.current.active) {
        return;
      }

      touchStateRef.current.currentX = touch.clientX;
      touchStateRef.current.currentY = touch.clientY;
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
    [movePan, movePinch, usesPageRail]
  );

  const endTouch = useCallback(
    (changedTouches?: TouchInput): void => {
      if (pinchStateRef.current !== null) {
        endPinch();
        return;
      }
      const changedTouch =
        changedTouches === undefined ? null : getFirstTouch(changedTouches);
      if (panStateRef.current.pointerId === "touch") {
        const wasPanned = didPanRef.current;
        endPan("touch");
        if (!wasPanned && changedTouch !== null) {
          registerTap(changedTouch.clientX, changedTouch.clientY);
        }
        return;
      }
      if (!touchStateRef.current.active) {
        if (!didPanRef.current && changedTouch !== null) {
          registerTap(changedTouch.clientX, changedTouch.clientY);
        }
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
        registerTap(
          changedTouch?.clientX ?? touchStateRef.current.currentX,
          changedTouch?.clientY ?? touchStateRef.current.currentY
        );
        return;
      }

      const direction = deltaX > 0 ? "left" : "right";
      const targetIndex = getSwipeTargetIndex(
        direction,
        displayedIndex,
        pages.length,
        readingDirection,
        spreadStartIndex,
        viewMode
      );

      if (targetIndex === undefined) {
        setDragOffset(0);
        return;
      }

      goByHorizontalDirection(direction);
    },
    [
      displayedIndex,
      endPan,
      endPinch,
      goByHorizontalDirection,
      pages.length,
      readingDirection,
      registerTap,
      spreadStartIndex,
      viewMode,
    ]
  );

  const cancelTouch = useCallback((): void => {
    if (pinchStateRef.current !== null) {
      endPinch();
      return;
    }
    if (panStateRef.current.pointerId === "touch") {
      endPan("touch");
      return;
    }
    if (!touchStateRef.current.active) {
      return;
    }

    touchStateRef.current.active = false;
    setDragOffset(0);
    setIsDragging(false);
  }, [endPan, endPinch]);

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
      if (
        touchStateRef.current.active ||
        panStateRef.current.pointerId === "touch" ||
        pinchStateRef.current !== null
      ) {
        event.stopPropagation();
        moveTouch(getTouches(event));
        if (
          (pinchStateRef.current !== null ||
            panStateRef.current.pointerId === "touch" ||
            Math.abs(
              touchStateRef.current.currentX - touchStateRef.current.startX
            ) >= MIN_SWIPE_THRESHOLD_PX) &&
          event.cancelable
        ) {
          event.preventDefault();
        }
      }
    };
    const onTouchEnd = (event: Event): void => {
      if (
        touchStateRef.current.active ||
        panStateRef.current.pointerId === "touch" ||
        pinchStateRef.current !== null
      ) {
        event.stopPropagation();
        endTouch(
          (event as unknown as { changedTouches: TouchInput }).changedTouches
        );
        didPanRef.current = false;
      }
    };
    const onTouchCancel = (event: Event): void => {
      if (
        touchStateRef.current.active ||
        panStateRef.current.pointerId === "touch" ||
        pinchStateRef.current !== null
      ) {
        event.stopPropagation();
        cancelTouch();
        didPanRef.current = false;
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
      data-pannable={isPannable || undefined}
      data-panning={panningKey === panKey || undefined}
      data-page-fit-mode={pageFitMode}
      onClick={handleEdgeClick}
      onKeyDown={handleKeyDown}
      onTouchStart={(event) => {
        event.stopPropagation();
        beginTouch(event.touches);
      }}
      onTouchMove={(event) => {
        event.stopPropagation();
        moveTouch(event.touches);
        if (pinchStateRef.current !== null && event.cancelable) {
          event.preventDefault();
        }
      }}
      onTouchEnd={(event) => {
        event.stopPropagation();
        endTouch(event.changedTouches);
        if (didPanRef.current && event.cancelable) {
          event.preventDefault();
        }
        didPanRef.current = false;
      }}
      onTouchCancel={(event) => {
        event.stopPropagation();
        cancelTouch();
        didPanRef.current = false;
      }}
      onPointerDown={(event) => {
        if (
          !isPannable ||
          !event.isPrimary ||
          (event.pointerType === "mouse" && event.button !== 0)
        ) {
          return;
        }

        beginPan(event.pointerId, event.clientX, event.clientY);
        event.currentTarget.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        if (movePan(event.pointerId, event.clientX, event.clientY)) {
          event.preventDefault();
        }
      }}
      onPointerUp={(event) => {
        endPan(event.pointerId);
      }}
      onPointerCancel={(event) => {
        endPan(event.pointerId);
      }}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The viewer is a composite widget, not a button.
      role="button"
      tabIndex={0}
    >
      <ViewportRail
        activePan={activePan}
        activeZoom={activeZoom}
        dragOffset={dragOffset}
        getPageIndices={orderedIndicesFor}
        isDragging={isDragging}
        layoutTemplate={layoutTemplate}
        onTransitionEnd={
          pageTurnTransition?.phase === "active"
            ? (event) => handleTransitionEnd(pageTurnTransition.id, event)
            : undefined
        }
        pageImages={pageImages}
        pageTemplate={pageTemplate}
        pages={pages}
        pageTurnTransition={pageTurnTransition}
        railSpreadIndices={railSpreadIndices}
        readingDirection={readingDirection}
        renderPage={renderPage}
        viewMode={viewMode}
      />
    </div>
  );
};
