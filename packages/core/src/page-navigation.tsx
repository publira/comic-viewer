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
  MouseEvent,
  PropsWithChildren,
  ReactNode,
} from "react";

import { useViewerContext } from "./viewer-context";

interface PageNavigationState {
  isProgressVisible: boolean;
  showProgress: () => void;
}

const PageNavigationContext = createContext<PageNavigationState | null>(null);

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

const getStep = (viewMode: "single" | "double"): number =>
  viewMode === "double" ? 2 : 1;

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
      className={`pcv-previous-page-button${props.className === undefined ? "" : ` ${props.className}`}`}
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
  const { currentIndex, goToNext, pages, viewMode } = useViewerContext();
  const isDisabled =
    disabled || currentIndex + getStep(viewMode) >= pages.length;
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
      className={`pcv-next-page-button${props.className === undefined ? "" : ` ${props.className}`}`}
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
  const { currentIndex, pages, viewMode } = useViewerContext();
  const firstPage = pages.length === 0 ? 0 : currentIndex + 1;
  const lastPage = Math.min(currentIndex + getStep(viewMode), pages.length);
  let defaultLabel = "No pages";
  if (pages.length > 0) {
    defaultLabel =
      firstPage === lastPage
        ? `Page ${firstPage} of ${pages.length}`
        : `Pages ${firstPage}-${lastPage} of ${pages.length}`;
  }
  const label =
    format?.({
      currentIndex,
      firstPage,
      lastPage,
      pageCount: pages.length,
      viewMode,
    }) ?? defaultLabel;

  return (
    <output
      aria-live="polite"
      className={`pcv-page-status${className === undefined ? "" : ` ${className}`}`}
    >
      {label}
    </output>
  );
};

export interface PageProgressProps {
  "aria-label"?: string;
  className?: string;
  visible?: boolean;
}

/** Displays the reading progress. Compose it with PageStatus as needed. */
export const PageProgress = ({
  "aria-label": ariaLabel = "Reading progress",
  className,
  children,
  visible,
}: PageProgressProps & PropsWithChildren) => {
  const navigation = useContext(PageNavigationContext);
  const { currentIndex, pages, viewMode } = useViewerContext();
  const isVisible = visible ?? navigation?.isProgressVisible ?? true;
  const visiblePageCount = viewMode === "double" ? 2 : 1;
  const currentPage = Math.min(currentIndex + visiblePageCount, pages.length);

  return (
    <div
      aria-hidden={!isVisible}
      className={`pcv-page-progress${className === undefined ? "" : ` ${className}`}`}
    >
      <progress
        aria-label={ariaLabel}
        className="pcv-page-progress-track"
        max={Math.max(1, pages.length)}
        value={currentPage}
      />
      {children}
    </div>
  );
};

export type PageProgressTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** A non-navigating control that consumers can use to reveal reading progress. */
export const PageProgressTrigger = ({
  "aria-label": ariaLabel = "Show reading progress",
  className,
  onClick,
  ...props
}: PageProgressTriggerProps) => {
  const navigation = useContext(PageNavigationContext);
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      navigation?.showProgress();
    }
  };

  return (
    <button
      {...props}
      aria-label={ariaLabel}
      className={`pcv-page-progress-trigger${className === undefined ? "" : ` ${className}`}`}
      onClick={handleClick}
      type="button"
    />
  );
};

/**
 * A semantic, unthemed page-navigation group. Supply children to arrange the
 * controls yourself, or omit them to render the standard previous/status/next
 * sequence.
 */
export const PageNavigation = ({
  "aria-label": ariaLabel = "Page navigation",
  children,
  className,
}: PageNavigationProps) => {
  const { readingDirection } = useViewerContext();
  const [isProgressVisible, setIsProgressVisible] = useState(false);
  const hideProgressTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const showProgress = useCallback(() => {
    setIsProgressVisible(true);
    if (hideProgressTimeout.current !== null) {
      clearTimeout(hideProgressTimeout.current);
    }
    hideProgressTimeout.current = setTimeout(
      () => setIsProgressVisible(false),
      2000
    );
  }, []);
  useEffect(
    () => () => {
      if (hideProgressTimeout.current !== null) {
        clearTimeout(hideProgressTimeout.current);
      }
    },
    []
  );
  const navigationValue = useMemo(
    () => ({ isProgressVisible, showProgress }),
    [isProgressVisible, showProgress]
  );

  return (
    <PageNavigationContext.Provider value={navigationValue}>
      <nav
        aria-label={ariaLabel}
        className={`pcv-page-navigation${className === undefined ? "" : ` ${className}`}`}
        data-reading-direction={readingDirection}
        dir={readingDirection}
      >
        {children ?? (
          <>
            <PreviousPageButton>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d={
                    readingDirection === "rtl"
                      ? "m10 6 6 6-6 6"
                      : "m14 6-6 6 6 6"
                  }
                />
              </svg>
            </PreviousPageButton>
            <PageProgressTrigger />
            <PageProgress>
              <PageStatus />
            </PageProgress>
            <NextPageButton>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d={
                    readingDirection === "rtl"
                      ? "m14 6-6 6 6 6"
                      : "m10 6 6 6-6 6"
                  }
                />
              </svg>
            </NextPageButton>
          </>
        )}
      </nav>
    </PageNavigationContext.Provider>
  );
};
