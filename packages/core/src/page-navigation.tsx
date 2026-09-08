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
  getPageSlot,
  getSpreadIndex,
  getVisiblePageCount,
  useViewerContext,
} from "./viewer-context";
import type { ViewerSlot, ViewerSlotPages, ViewMode } from "./viewer-context";

interface PageProgressState {
  ariaLabel: string;
  /**
   * The index a slider inside the progress is being dragged to, or `null`
   * while no drag is in progress. The other progress primitives read it so
   * that they follow the thumb before the drag commits its page turn.
   */
  scrubIndex: number | null;
  setScrubIndex: (index: number | null) => void;
}

const PageProgressContext = createContext<PageProgressState | null>(null);

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
  const { currentIndex, goToNext, maxIndex, spreadStartIndex, viewMode } =
    useViewerContext();
  const isDisabled =
    disabled ||
    currentIndex +
      getVisiblePageCount(viewMode, currentIndex, maxIndex, spreadStartIndex) >
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
  viewMode: "single" | "double";
}

export interface PageStatusProps {
  className?: string;
  format?: (value: PageStatusValue) => ReactNode;
}

const getSlotLabel = (slot: ViewerSlot): string =>
  slot === "start" ? "Start page" : "End page";

interface PageStatusInput extends ViewerSlotPages {
  currentIndex: number;
  maxIndex: number;
  pageCount: number;
  spreadStartIndex: number;
  viewMode: ViewMode;
}

/**
 * Describes the pages an index puts on screen, in the numbering the document
 * itself uses.
 */
const getPageStatusValue = ({
  currentIndex,
  endPage,
  maxIndex,
  pageCount,
  spreadStartIndex,
  startPage,
  viewMode,
}: PageStatusInput): PageStatusValue => {
  const lastIndex =
    currentIndex +
    getVisiblePageCount(viewMode, currentIndex, maxIndex, spreadStartIndex) -
    1;
  // A slot page is counted neither in the page numbers nor in the total, so
  // the reader keeps the numbering of the document itself.
  const slotPages = { endPage, startPage };
  const slot =
    getPageSlot(currentIndex, pageCount, slotPages) ??
    getPageSlot(lastIndex, pageCount, slotPages);
  const firstVisiblePage = Math.max(currentIndex, 0) + 1;
  const lastVisiblePage = Math.min(lastIndex + 1, pageCount);
  const hasVisiblePages = pageCount > 0 && firstVisiblePage <= lastVisiblePage;

  return {
    currentIndex,
    firstPage: hasVisiblePages ? firstVisiblePage : 0,
    lastPage: hasVisiblePages ? lastVisiblePage : 0,
    pageCount,
    slot,
    viewMode,
  };
};

const getDefaultPageStatusLabel = ({
  firstPage,
  lastPage,
  pageCount,
  slot,
}: PageStatusValue): string => {
  if (firstPage === 0 || lastPage === 0) {
    return slot === undefined ? "No pages" : getSlotLabel(slot);
  }

  return firstPage === lastPage
    ? `Page ${firstPage} of ${pageCount}`
    : `Pages ${firstPage}-${lastPage} of ${pageCount}`;
};

/**
 * Returns the index the reading-progress primitives report. A drag in
 * progress moves them to the page under the thumb, which the reading position
 * itself only reaches once the drag is released.
 */
const useProgressIndex = (currentIndex: number): number => {
  const pageProgress = useContext(PageProgressContext);

  return pageProgress?.scrubIndex ?? currentIndex;
};

/** Announces the current visible page or spread. */
export const PageStatus = ({ className, format }: PageStatusProps) => {
  const {
    currentIndex,
    endPage,
    maxIndex,
    pageCount,
    spreadStartIndex,
    startPage,
    viewMode,
  } = useViewerContext();
  const progressIndex = useProgressIndex(currentIndex);
  const value = getPageStatusValue({
    currentIndex: progressIndex,
    endPage,
    maxIndex,
    pageCount,
    spreadStartIndex,
    startPage,
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
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const progressValue = useMemo(
    () => ({ ariaLabel, scrubIndex, setScrubIndex }),
    [ariaLabel, scrubIndex]
  );

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
  const { currentIndex, maxIndex, pageCount, spreadStartIndex, viewMode } =
    useViewerContext();
  const progressIndex = useProgressIndex(currentIndex);
  const visiblePageCount = getVisiblePageCount(
    viewMode,
    progressIndex,
    maxIndex,
    spreadStartIndex
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
 * the document is. A drag carries the progress and the status along with the
 * thumb and turns the page on release alone rather than at every index it
 * passes over, and in double-page mode every value snaps to the page its
 * spread starts from, so a keyboard step moves by a whole spread. It sets
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
    endPage,
    goTo,
    holdControls,
    maxIndex,
    minIndex,
    pageCount,
    spreadStartIndex,
    startPage,
    viewMode,
  } = useViewerContext();
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  // A drag ends on an event that arrives from the window rather than through
  // React, and reports its steps before a render carries them into state, so
  // both are read back through refs.
  const isScrubbingRef = useRef(false);
  const scrubIndexRef = useRef<number | null>(null);
  const publishScrubIndex = pageProgress?.setScrubIndex;
  const snapToSpread = useCallback(
    (index: number): number =>
      getSpreadIndex(index, minIndex, maxIndex, spreadStartIndex, viewMode),
    [maxIndex, minIndex, spreadStartIndex, viewMode]
  );
  const value = snapToSpread(scrubIndex ?? currentIndex);

  // The primitives composed next to the slider follow the drag through the
  // shared progress state, and a slider that unmounts mid-drag leaves none of
  // it behind for them.
  useEffect(() => {
    publishScrubIndex?.(scrubIndex);

    return () => {
      publishScrubIndex?.(null);
    };
  }, [publishScrubIndex, scrubIndex]);

  // A finger that leaves the toolbar mid-drag would otherwise let the reader
  // controls hide and turn inert under it, and the event that ends the drag
  // lands wherever the pointer has gone by then.
  useEffect(() => {
    if (!isScrubbing) {
      return;
    }

    holdControls(true);

    const endScrub = (): void => {
      const nextIndex = scrubIndexRef.current;
      isScrubbingRef.current = false;
      scrubIndexRef.current = null;
      setIsScrubbing(false);
      setScrubIndex(null);

      if (nextIndex !== null) {
        goTo(nextIndex);
      }
    };

    window.addEventListener("pointercancel", endScrub);
    window.addEventListener("pointerup", endScrub);

    return () => {
      holdControls(false);
      window.removeEventListener("pointercancel", endScrub);
      window.removeEventListener("pointerup", endScrub);
    };
  }, [goTo, holdControls, isScrubbing]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLInputElement>) => {
      onPointerDown?.(event);
      if (event.defaultPrevented) {
        return;
      }

      isScrubbingRef.current = true;
      setIsScrubbing(true);
    },
    [onPointerDown]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      if (event.defaultPrevented) {
        return;
      }

      const requestedIndex = Number(event.target.value);
      const snappedIndex = snapToSpread(requestedIndex);

      // Turning the page at every index a drag reports would fire a page-turn
      // transition and a round of page resolution for each of them, so a drag
      // previews them and commits only the one it is released on.
      if (isScrubbingRef.current) {
        scrubIndexRef.current = snappedIndex;
        setScrubIndex(snappedIndex);
        return;
      }

      // A keyboard step has no release to wait for. One that lands on the
      // facing page of the spread the reader is already on would snap straight
      // back to it, so it carries on to the next spread it is heading for.
      const isStuckOnTheSameSpread =
        snappedIndex === value && requestedIndex !== value;
      goTo(
        isStuckOnTheSameSpread
          ? snapToSpread(requestedIndex + Math.sign(requestedIndex - value))
          : snappedIndex
      );
    },
    [goTo, onChange, snapToSpread, value]
  );

  const statusValue = getPageStatusValue({
    currentIndex: value,
    endPage,
    maxIndex,
    pageCount,
    spreadStartIndex,
    startPage,
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
      step={1}
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
