import { useCallback } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";

import { composeClassName } from "./class-names";
import { useViewerContext } from "./viewer-context";
import type { PageFitMode, ReadingDirection } from "./viewer-context";

/**
 * The shape every reader-setting toggle shares. Each renders a plain button
 * and takes its visual content through `children`, exactly as the page
 * navigation buttons do, and `onClick` can `preventDefault` to cancel the
 * change the button would otherwise make.
 */
type ReaderSettingToggleProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick"
> & {
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export type ViewModeToggleProps = ReaderSettingToggleProps;

export type ReadingDirectionToggleProps = ReaderSettingToggleProps;

export type PageFitModeToggleProps = ReaderSettingToggleProps & {
  /**
   * The mode the button selects, which also makes it report whether that mode
   * is the current one through `aria-pressed`. Give one button each mode to
   * build a group of them. Omitting it leaves a single button that cycles
   * through the modes instead.
   */
  mode?: PageFitMode;
};

const readingDirectionLabels: Readonly<Record<ReadingDirection, string>> = {
  ltr: "Left to right",
  rtl: "Right to left",
};

const pageFitModeLabels: Readonly<Record<PageFitMode, string>> = {
  actual: "Actual size",
  height: "Fit to height",
  width: "Fit to width",
};

/** The order a cycling PageFitModeToggle walks the modes in. */
const pageFitModeCycle: readonly PageFitMode[] = ["height", "width", "actual"];

const getNextPageFitMode = (mode: PageFitMode): PageFitMode => {
  const nextIndex =
    (pageFitModeCycle.indexOf(mode) + 1) % pageFitModeCycle.length;

  return pageFitModeCycle[nextIndex] ?? mode;
};

/**
 * Switches the reader between single-page and double-page display. It is
 * disabled while the viewport is too narrow for a spread, which `useViewMode`
 * reports, so it never offers a mode the layout would drop again.
 */
export const ViewModeToggle = ({
  "aria-label": ariaLabel = "Double-page view",
  children = "Double page",
  disabled = false,
  onClick,
  ...props
}: ViewModeToggleProps) => {
  const { isDoublePageAvailable, setViewMode, viewMode } = useViewerContext();
  const isDoublePage = viewMode === "double";
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        setViewMode(isDoublePage ? "single" : "double");
      }
    },
    [isDoublePage, onClick, setViewMode]
  );

  return (
    <button
      {...props}
      aria-label={ariaLabel}
      aria-pressed={isDoublePage}
      className={composeClassName("pcv-view-mode-toggle", props.className)}
      data-view-mode={viewMode}
      disabled={disabled || !isDoublePageAvailable}
      onClick={handleClick}
      type="button"
    >
      {children}
    </button>
  );
};

/**
 * Switches the reader between right-to-left and left-to-right reading. Neither
 * direction is the pressed state of the other, so the current one is reported
 * through `data-reading-direction` and named in the default label.
 */
export const ReadingDirectionToggle = ({
  "aria-label": ariaLabel,
  children,
  onClick,
  ...props
}: ReadingDirectionToggleProps) => {
  const { readingDirection, setReadingDirection } = useViewerContext();
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        setReadingDirection(readingDirection === "rtl" ? "ltr" : "rtl");
      }
    },
    [onClick, readingDirection, setReadingDirection]
  );

  return (
    <button
      {...props}
      aria-label={
        ariaLabel ??
        `Reading direction: ${readingDirectionLabels[readingDirection]}`
      }
      className={composeClassName(
        "pcv-reading-direction-toggle",
        props.className
      )}
      data-reading-direction={readingDirection}
      onClick={handleClick}
      type="button"
    >
      {children ?? readingDirectionLabels[readingDirection]}
    </button>
  );
};

/**
 * Sets how a page is sized inside the viewport. Given a `mode` it selects that
 * mode and reports whether it is the current one, which composes into a group
 * the consumer builds; given none it cycles through the three modes.
 */
export const PageFitModeToggle = ({
  "aria-label": ariaLabel,
  children,
  mode,
  onClick,
  ...props
}: PageFitModeToggleProps) => {
  const { pageFitMode, setPageFitMode } = useViewerContext();
  // A button that names a mode always sets that one; a cycling button sets
  // whichever mode follows the one the reader is on.
  const targetMode = mode ?? getNextPageFitMode(pageFitMode);
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        setPageFitMode(targetMode);
      }
    },
    [onClick, setPageFitMode, targetMode]
  );

  return (
    <button
      {...props}
      aria-label={
        ariaLabel ??
        (mode === undefined
          ? `Page fit: ${pageFitModeLabels[pageFitMode]}`
          : pageFitModeLabels[mode])
      }
      aria-pressed={mode === undefined ? undefined : pageFitMode === mode}
      className={composeClassName("pcv-page-fit-mode-toggle", props.className)}
      data-page-fit-mode={pageFitMode}
      onClick={handleClick}
      type="button"
    >
      {children ?? pageFitModeLabels[mode ?? pageFitMode]}
    </button>
  );
};
