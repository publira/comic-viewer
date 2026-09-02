import { createContext, useCallback, useContext, useMemo } from "react";
import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
} from "react";

import { composeClassName } from "./class-names";
import { useControlsHold } from "./use-controls-hold";
import {
  getPageSlot,
  getVisiblePageCount,
  useViewerContext,
} from "./viewer-context";
import type { ViewerSlot } from "./viewer-context";

interface PageProgressState {
  ariaLabel: string;
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
  const firstPage = hasVisiblePages ? firstVisiblePage : 0;
  const lastPage = hasVisiblePages ? lastVisiblePage : 0;
  let defaultLabel = "No pages";
  if (hasVisiblePages) {
    defaultLabel =
      firstPage === lastPage
        ? `Page ${firstPage} of ${pageCount}`
        : `Pages ${firstPage}-${lastPage} of ${pageCount}`;
  } else if (slot !== undefined) {
    defaultLabel = getSlotLabel(slot);
  }
  const label =
    format?.({
      currentIndex,
      firstPage,
      lastPage,
      pageCount,
      slot,
      viewMode,
    }) ?? defaultLabel;

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
  const { currentIndex, maxIndex, pageCount, spreadStartIndex, viewMode } =
    useViewerContext();
  const visiblePageCount = getVisiblePageCount(
    viewMode,
    currentIndex,
    maxIndex,
    spreadStartIndex
  );
  // A slot page leaves the progress where the pages next to it put it, since
  // it is not one of the pages being counted.
  const currentPage = Math.min(
    Math.max(currentIndex + visiblePageCount, 0),
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
