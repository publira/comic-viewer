import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  ComponentPropsWithoutRef,
  CSSProperties,
  MouseEvent,
  PointerEvent,
  PropsWithChildren,
  ReactNode,
} from "react";

import { composeClassName } from "./class-names";
import { useControlsHold } from "./use-controls-hold";
import {
  getScrubSpread,
  getSlotPage,
  getSpreadIndex,
  getVisiblePageCount,
  useViewerContext,
} from "./viewer-context";
import type {
  ViewerPage,
  ViewerSlot,
  ViewerSlotPages,
  ViewMode,
} from "./viewer-context";

interface PageProgressState {
  ariaLabel: string;
}

const PageProgressContext = createContext<PageProgressState | null>(null);

/**
 * How long the thumb takes to settle on its spread once a drag is released,
 * which is how long the page-turn slide the pages settle with takes.
 */
const THUMB_SETTLE_DURATION_MS = 260;

/**
 * Follows the CSS `ease-out` timing function, `cubic-bezier(0, 0, 0.58, 1)`,
 * that the page-turn slide runs on, so the thumb keeps pace with the pages
 * all the way rather than only arriving together.
 */
const sampleCubicBezier = (t: number, p1: number, p2: number): number =>
  3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3;

const easeOut = (progress: number): number => {
  let lower = 0;
  let upper = 1;
  let t = progress;

  // The curve is monotonic in x, so bisection finds the parameter whose x is
  // the elapsed share of the duration.
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const x = sampleCubicBezier(t, 0, 0.58);
    if (Math.abs(x - progress) < 1e-4) {
      break;
    }
    if (x < progress) {
      lower = t;
    } else {
      upper = t;
    }
    t = (lower + upper) / 2;
  }

  return sampleCubicBezier(t, 0, 1);
};

type PageNavigationButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick"
> & {
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export interface PageNavigationProps extends PropsWithChildren {
  className?: string;
  "aria-label"?: string;
}

/** Navigates to the preceding set of visible pages. */
export const PreviousPageButton = ({
  "aria-label": ariaLabel = "Previous page",
  children = "Previous page",
  disabled = false,
  onClick,
  ...props
}: PageNavigationButtonProps) => {
  const { currentIndex, goToPrev, minIndex } = useViewerContext();
  const isDisabled = disabled || currentIndex <= minIndex;
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        goToPrev();
      }
    },
    [goToPrev, onClick]
  );

  return (
    <button
      {...props}
      aria-label={ariaLabel}
      className={composeClassName("pcv-previous-page-button", props.className)}
      disabled={isDisabled}
      onClick={handleClick}
      type="button"
    >
      {children}
    </button>
  );
};

/** Navigates to the following set of visible pages. */
export const NextPageButton = ({
  "aria-label": ariaLabel = "Next page",
  children = "Next page",
  disabled = false,
  onClick,
  ...props
}: PageNavigationButtonProps) => {
  const {
    currentIndex,
    goToNext,
    maxIndex,
    pages,
    spreadStartIndex,
    viewMode,
  } = useViewerContext();
  const isDisabled =
    disabled ||
    currentIndex +
      getVisiblePageCount(
        viewMode,
        currentIndex,
        maxIndex,
        spreadStartIndex,
        pages
      ) >
      maxIndex;
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        goToNext();
      }
    },
    [goToNext, onClick]
  );

  return (
    <button
      {...props}
      aria-label={ariaLabel}
      className={composeClassName("pcv-next-page-button", props.className)}
      disabled={isDisabled}
      onClick={handleClick}
      type="button"
    >
      {children}
    </button>
  );
};

export interface PageStatusValue {
  currentIndex: number;
  /**
   * The one-based number of the first page on screen, or `0` while none of
   * the pages of the document is visible.
   */
  firstPage: number;
  /** The one-based number of the last page on screen, or `0` as `firstPage`. */
  lastPage: number;
  pageCount: number;
  /** The slot of the extra page on screen, if one of them is showing. */
  slot?: ViewerSlot;
  /**
   * The one-based position the first extra page on screen takes among the
   * pages of its slot, absent while none of them is showing.
   */
  firstSlotPage?: number;
  /**
   * The position of the last extra page of that slot on screen, which is
   * `firstSlotPage` unless a spread holds two pages of the same slot.
   */
  lastSlotPage?: number;
  /** How many pages that slot holds, absent as `firstSlotPage` is. */
  slotPageCount?: number;
  viewMode: "single" | "double";
}

export interface PageStatusProps {
  className?: string;
  format?: (value: PageStatusValue) => ReactNode;
}

const getSlotLabel = ({
  firstSlotPage,
  lastSlotPage,
  slot,
  slotPageCount,
}: PageStatusValue): string => {
  const label = slot === "start" ? "Start page" : "End page";

  // A slot holding one page has nothing to tell apart, so it keeps the plain
  // name a reader of a single notice or chapter link expects.
  if (slotPageCount === undefined || slotPageCount < 2) {
    return label;
  }

  return firstSlotPage === lastSlotPage
    ? `${label} ${firstSlotPage} of ${slotPageCount}`
    : `${label}s ${firstSlotPage}-${lastSlotPage} of ${slotPageCount}`;
};

interface PageStatusInput extends ViewerSlotPages {
  currentIndex: number;
  maxIndex: number;
  pageCount: number;
  /** The page list, which reports the pages that fill a spread on their own. */
  pages: readonly (ViewerPage | undefined)[];
  spreadStartIndex: number;
  viewMode: ViewMode;
}

/**
 * Describes the pages an index puts on screen, in the numbering the document
 * itself uses.
 */
const getPageStatusValue = ({
  currentIndex,
  endPages,
  maxIndex,
  pageCount,
  pages,
  spreadStartIndex,
  startPages,
  viewMode,
}: PageStatusInput): PageStatusValue => {
  const lastIndex =
    currentIndex +
    getVisiblePageCount(
      viewMode,
      currentIndex,
      maxIndex,
      spreadStartIndex,
      pages
    ) -
    1;
  // A slot page is counted neither in the page numbers nor in the total, so
  // the reader keeps the numbering of the document itself.
  const slotPages = { endPages, startPages };
  const lastVisibleSlotPage = getSlotPage(lastIndex, pageCount, slotPages);
  const slotPage =
    getSlotPage(currentIndex, pageCount, slotPages) ?? lastVisibleSlotPage;
  // A spread that pairs two pages of the same slot is reported as the range
  // they cover, the way a spread of two pages of the document is.
  const lastSlotPage =
    lastVisibleSlotPage?.slot === slotPage?.slot
      ? lastVisibleSlotPage
      : slotPage;
  const firstVisiblePage = Math.max(currentIndex, 0) + 1;
  const lastVisiblePage = Math.min(lastIndex + 1, pageCount);
  const hasVisiblePages = pageCount > 0 && firstVisiblePage <= lastVisiblePage;

  return {
    currentIndex,
    firstPage: hasVisiblePages ? firstVisiblePage : 0,
    firstSlotPage: slotPage?.position,
    lastPage: hasVisiblePages ? lastVisiblePage : 0,
    lastSlotPage: lastSlotPage?.position,
    pageCount,
    slot: slotPage?.slot,
    slotPageCount: slotPage?.count,
    viewMode,
  };
};

const getDefaultPageStatusLabel = (value: PageStatusValue): string => {
  const { firstPage, lastPage, pageCount, slot } = value;

  if (firstPage === 0 || lastPage === 0) {
    return slot === undefined ? "No pages" : getSlotLabel(value);
  }

  return firstPage === lastPage
    ? `Page ${firstPage} of ${pageCount}`
    : `Pages ${firstPage}-${lastPage} of ${pageCount}`;
};

/**
 * Returns the index the reading-progress primitives report. A scrub in
 * progress moves them to the spread nearest the thumb, which the reading
 * position itself only reaches once the scrub is released.
 */
const useProgressIndex = (): number => {
  const {
    currentIndex,
    maxIndex,
    minIndex,
    pages,
    scrubPosition,
    spreadStartIndex,
    viewMode,
  } = useViewerContext();

  return scrubPosition === null
    ? currentIndex
    : getScrubSpread(
        scrubPosition,
        minIndex,
        maxIndex,
        spreadStartIndex,
        viewMode,
        pages
      ).nearestIndex;
};

/** Announces the current visible page or spread. */
export const PageStatus = ({ className, format }: PageStatusProps) => {
  const {
    endPages,
    maxIndex,
    pageCount,
    pages,
    spreadStartIndex,
    startPages,
    viewMode,
  } = useViewerContext();
  const progressIndex = useProgressIndex();
  const value = getPageStatusValue({
    currentIndex: progressIndex,
    endPages,
    maxIndex,
    pageCount,
    pages,
    spreadStartIndex,
    startPages,
    viewMode,
  });
  const label = format?.(value) ?? getDefaultPageStatusLabel(value);

  return (
    <output
      aria-live="polite"
      className={composeClassName("pcv-page-status", className)}
    >
      {label}
    </output>
  );
};

export interface PageProgressProps {
  "aria-label"?: string;
  className?: string;
  /**
   * Hides the progress independently of its container. Compose PageProgress
   * inside Toolbar to follow the shared reader-control visibility instead.
   */
  visible?: boolean;
}

/** Provides a container for the reading-progress primitives. */
export const PageProgress = ({
  "aria-label": ariaLabel = "Reading progress",
  className,
  children,
  visible = true,
}: PageProgressProps & PropsWithChildren) => {
  const progressValue = useMemo(() => ({ ariaLabel }), [ariaLabel]);

  return (
    <PageProgressContext.Provider value={progressValue}>
      <div
        aria-hidden={!visible}
        className={composeClassName("pcv-page-progress", className)}
      >
        {children}
      </div>
    </PageProgressContext.Provider>
  );
};

export type PageProgressTrackProps = ComponentPropsWithoutRef<"progress">;

/** Displays the current reading progress. Compose it inside PageProgress. */
export const PageProgressTrack = ({
  "aria-label": ariaLabel,
  className,
  max,
  value,
  ...props
}: PageProgressTrackProps) => {
  const pageProgress = useContext(PageProgressContext);
  const { maxIndex, pageCount, pages, spreadStartIndex, viewMode } =
    useViewerContext();
  const progressIndex = useProgressIndex();
  const visiblePageCount = getVisiblePageCount(
    viewMode,
    progressIndex,
    maxIndex,
    spreadStartIndex,
    pages
  );
  // A slot page leaves the progress where the pages next to it put it, since
  // it is not one of the pages being counted.
  const currentPage = Math.min(
    Math.max(progressIndex + visiblePageCount, 0),
    pageCount
  );

  return (
    <progress
      {...props}
      aria-label={ariaLabel ?? pageProgress?.ariaLabel}
      className={composeClassName("pcv-page-progress-track", className)}
      max={max ?? Math.max(1, pageCount)}
      value={value ?? currentPage}
    />
  );
};

export type PageProgressSliderProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "children" | "defaultValue" | "max" | "min" | "step" | "type" | "value"
>;

/**
 * Scrubs the reading position to any page of the document. Compose it inside
 * PageProgress.
 *
 * It counts in the navigable indices `goTo` takes, from `minIndex` to
 * `maxIndex`, so a start or an end page is a position on it like a page of
 * the document is. A drag moves the thumb with the pointer rather than from one
 * index to the next, and the pages move with it, part of the way into the next
 * spread where the thumb rests between two of them. The reading position is
 * committed once, on release, to the spread nearest the thumb, and the thumb
 * glides to that spread's place as the pages slide there. A keyboard step
 * commits at once, and in double-page mode every value it lands on snaps to
 * the page its spread starts from, so it moves by a whole spread. It sets
 * `--pcv-page-progress-fill` to the share of the document the thumb rests at,
 * for a stylesheet that paints its track.
 */
export const PageProgressSlider = ({
  "aria-label": ariaLabel,
  "aria-valuetext": ariaValueText,
  className,
  disabled = false,
  onChange,
  onPointerDown,
  style,
  ...props
}: PageProgressSliderProps) => {
  const pageProgress = useContext(PageProgressContext);
  const {
    currentIndex,
    endPages,
    goTo,
    holdControls,
    maxIndex,
    minIndex,
    pageCount,
    pages,
    scrubPosition,
    setScrubPosition,
    spreadStartIndex,
    startPages,
    viewMode,
  } = useViewerContext();
  const [isScrubbing, setIsScrubbing] = useState(false);
  // A drag ends on an event that arrives from the window rather than through
  // React, and reports its steps before a render carries them into state, so
  // both are read back through refs.
  const isScrubbingRef = useRef(false);
  const scrubPositionRef = useRef<number | null>(null);
  const snapToSpread = useCallback(
    (index: number): number =>
      getSpreadIndex(
        index,
        minIndex,
        maxIndex,
        spreadStartIndex,
        viewMode,
        pages
      ),
    [maxIndex, minIndex, pages, spreadStartIndex, viewMode]
  );
  const restingValue = snapToSpread(currentIndex);
  const restingValueRef = useRef(restingValue);
  // Where the thumb is on its way from the point a drag was released at to
  // the spread the pages settle on, or `null` while it is not settling.
  const [settlingValue, setSettlingValue] = useState<number | null>(null);
  const settleFrameRef = useRef<number | null>(null);
  const progressIndex = useProgressIndex();
  const value =
    isScrubbing && scrubPosition !== null
      ? scrubPosition
      : (settlingValue ?? restingValue);

  useEffect(() => {
    restingValueRef.current = restingValue;
  }, [restingValue]);

  const cancelSettle = useCallback((): void => {
    if (settleFrameRef.current !== null) {
      cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = null;
    }
    setSettlingValue(null);
  }, []);

  // On release the pages slide from where the drag left them to the spread
  // nearest the thumb, and the thumb moves with them, from the point it was
  // released at to that spread's place, over the same time and on the same
  // curve, instead of jumping there. It heads for the spread the reading
  // position is at on every frame, which is the committed one, or the one a
  // controlled host kept instead.
  const settleThumb = useCallback((from: number): void => {
    if (
      typeof requestAnimationFrame !== "function" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let startTime: number | null = null;
    const step = (time: number): void => {
      if (startTime === null) {
        startTime = time;
      }
      const progress = Math.min(
        (time - startTime) / THUMB_SETTLE_DURATION_MS,
        1
      );

      if (progress === 1) {
        settleFrameRef.current = null;
        setSettlingValue(null);
        return;
      }

      setSettlingValue(
        from + (restingValueRef.current - from) * easeOut(progress)
      );
      settleFrameRef.current = requestAnimationFrame(step);
    };

    setSettlingValue(from);
    settleFrameRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(
    () => () => {
      if (settleFrameRef.current !== null) {
        cancelAnimationFrame(settleFrameRef.current);
      }
    },
    []
  );

  // A finger that leaves the toolbar mid-drag would otherwise let the reader
  // controls hide and turn inert under it, and the event that ends the drag
  // lands wherever the pointer has gone by then.
  useEffect(() => {
    if (!isScrubbing) {
      return;
    }

    holdControls(true);

    const endScrub = (): void => {
      const position = scrubPositionRef.current;
      isScrubbingRef.current = false;
      scrubPositionRef.current = null;
      setIsScrubbing(false);
      // Dropping the scrub and committing the spread it ends nearest to land
      // in the same render, so the pages move on from where the thumb left
      // them rather than from the spread the drag started on.
      setScrubPosition(null);

      if (position !== null) {
        settleThumb(position);
        goTo(
          getScrubSpread(
            position,
            minIndex,
            maxIndex,
            spreadStartIndex,
            viewMode,
            pages
          ).nearestIndex
        );
      }
    };

    window.addEventListener("pointercancel", endScrub);
    window.addEventListener("pointerup", endScrub);

    return () => {
      holdControls(false);
      window.removeEventListener("pointercancel", endScrub);
      window.removeEventListener("pointerup", endScrub);
    };
  }, [
    goTo,
    holdControls,
    isScrubbing,
    maxIndex,
    minIndex,
    pages,
    setScrubPosition,
    settleThumb,
    spreadStartIndex,
    viewMode,
  ]);

  // A slider that unmounts mid-drag leaves no scrub behind in the viewport.
  useEffect(
    () => () => {
      if (isScrubbingRef.current) {
        setScrubPosition(null);
      }
    },
    [setScrubPosition]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLInputElement>) => {
      onPointerDown?.(event);
      if (event.defaultPrevented) {
        return;
      }

      cancelSettle();
      isScrubbingRef.current = true;
      // The step is lifted before the browser places the thumb under the
      // pointer, so the thumb follows the pointer rather than jumping from
      // one index to the next.
      event.currentTarget.step = "any";
      setIsScrubbing(true);
    },
    [cancelSettle, onPointerDown]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      if (event.defaultPrevented) {
        return;
      }

      const requestedPosition = Number(event.target.value);

      // Committing every position a drag reports would hand each of them to
      // `onIndexChange` and turn the page for it, so a drag scrubs the
      // viewport and commits only the spread it is released nearest to.
      if (isScrubbingRef.current) {
        scrubPositionRef.current = requestedPosition;
        setScrubPosition(requestedPosition);
        return;
      }

      cancelSettle();
      const requestedIndex = Math.round(requestedPosition);
      const snappedIndex = snapToSpread(requestedIndex);

      // A keyboard step has no release to wait for. One that lands on the
      // facing page of the spread the reader is already on would snap straight
      // back to it, so it carries on to the next spread it is heading for.
      const isStuckOnTheSameSpread =
        snappedIndex === restingValue && requestedIndex !== restingValue;
      goTo(
        isStuckOnTheSameSpread
          ? snapToSpread(
              requestedIndex + Math.sign(requestedIndex - restingValue)
            )
          : snappedIndex
      );
    },
    [cancelSettle, goTo, onChange, restingValue, setScrubPosition, snapToSpread]
  );

  const statusValue = getPageStatusValue({
    currentIndex: isScrubbing ? progressIndex : restingValue,
    endPages,
    maxIndex,
    pageCount,
    pages,
    spreadStartIndex,
    startPages,
    viewMode,
  });
  const fillRatio =
    maxIndex > minIndex ? (value - minIndex) / (maxIndex - minIndex) : 0;

  return (
    <input
      {...props}
      aria-label={ariaLabel ?? pageProgress?.ariaLabel ?? "Reading progress"}
      aria-valuetext={ariaValueText ?? getDefaultPageStatusLabel(statusValue)}
      className={composeClassName("pcv-page-progress-slider", className)}
      disabled={disabled || maxIndex <= minIndex}
      max={maxIndex}
      min={minIndex}
      onChange={handleChange}
      onPointerDown={handlePointerDown}
      // A value between two indices would be rounded to one of them under a
      // step of one, so the step stays lifted while the thumb settles too.
      step={isScrubbing || settlingValue !== null ? "any" : 1}
      style={
        {
          ...style,
          "--pcv-page-progress-fill": `${fillRatio * 100}%`,
        } as CSSProperties
      }
      type="range"
      value={value}
    />
  );
};

/**
 * A semantic, unthemed page-navigation group. Supply children to arrange the
 * controls yourself, or omit them to render the standard previous/next pair.
 * It follows the reader-control visibility it shares with Toolbar.
 */
export const PageNavigation = ({
  "aria-label": ariaLabel = "Page navigation",
  children,
  className,
}: PageNavigationProps) => {
  const { areControlsVisible, readingDirection } = useViewerContext();
  const holdHandlers = useControlsHold();

  return (
    <nav
      {...holdHandlers}
      aria-hidden={!areControlsVisible}
      aria-label={ariaLabel}
      className={composeClassName("pcv-page-navigation", className)}
      data-reading-direction={readingDirection}
      dir={readingDirection}
      inert={!areControlsVisible}
    >
      {children ?? (
        <>
          <PreviousPageButton>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path
                d={
                  readingDirection === "rtl" ? "m10 6 6 6-6 6" : "m14 6-6 6 6 6"
                }
              />
            </svg>
          </PreviousPageButton>
          <NextPageButton>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path
                d={
                  readingDirection === "rtl" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"
                }
              />
            </svg>
          </NextPageButton>
        </>
      )}
    </nav>
  );
};
