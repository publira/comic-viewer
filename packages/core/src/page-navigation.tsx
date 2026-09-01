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
import { getVisiblePageCount, useViewerContext } from "./viewer-context";

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
  const { currentIndex, goToPrev } = useViewerContext();
  const isDisabled = disabled || currentIndex === 0;
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
  const { currentIndex, goToNext, pageCount, spreadStartIndex, viewMode } =
    useViewerContext();
  const isDisabled =
    disabled ||
    currentIndex +
      getVisiblePageCount(
        viewMode,
        currentIndex,
        pageCount,
        spreadStartIndex
      ) >=
      pageCount;
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
  firstPage: number;
  lastPage: number;
  pageCount: number;
  viewMode: "single" | "double";
}

export interface PageStatusProps {
  className?: string;
  format?: (value: PageStatusValue) => ReactNode;
}

/** Announces the current visible page or spread. */
export const PageStatus = ({ className, format }: PageStatusProps) => {
  const { currentIndex, pageCount, spreadStartIndex, viewMode } =
    useViewerContext();
  const firstPage = pageCount === 0 ? 0 : currentIndex + 1;
  const lastPage = Math.min(
    currentIndex +
      getVisiblePageCount(viewMode, currentIndex, pageCount, spreadStartIndex),
    pageCount
  );
  let defaultLabel = "No pages";
  if (pageCount > 0) {
    defaultLabel =
      firstPage === lastPage
        ? `Page ${firstPage} of ${pageCount}`
        : `Pages ${firstPage}-${lastPage} of ${pageCount}`;
  }
  const label =
    format?.({
      currentIndex,
      firstPage,
      lastPage,
      pageCount,
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
  const { currentIndex, pageCount, spreadStartIndex, viewMode } =
    useViewerContext();
  const visiblePageCount = getVisiblePageCount(
    viewMode,
    currentIndex,
    pageCount,
    spreadStartIndex
  );
  const currentPage = Math.min(currentIndex + visiblePageCount, pageCount);

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
