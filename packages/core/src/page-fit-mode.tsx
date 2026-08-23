import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { useViewerContext } from "./viewer-context";
import type { PageFitMode } from "./viewer-context";

type PageFitModeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-pressed" | "type"
> & {
  mode: PageFitMode;
};

/** Selects a page sizing mode. */
export const PageFitModeButton = ({
  children,
  className,
  mode,
  ...props
}: PageFitModeButtonProps) => {
  const { pageFitMode, setPageFitMode } = useViewerContext();

  return (
    <button
      {...props}
      aria-pressed={pageFitMode === mode}
      className={`pcv-page-fit-mode-button${className === undefined ? "" : ` ${className}`}`}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          setPageFitMode(mode);
        }
      }}
      type="button"
    >
      {children}
    </button>
  );
};

type PresetButtonProps = Omit<PageFitModeButtonProps, "mode">;

/** Fits each page to the available width. */
export const FitWidthButton = ({
  "aria-label": ariaLabel = "Fit page to width",
  children = "Fit width",
  ...props
}: PresetButtonProps) => (
  <PageFitModeButton {...props} aria-label={ariaLabel} mode="width">
    {children}
  </PageFitModeButton>
);

/** Fits each page to the available height. */
export const FitHeightButton = ({
  "aria-label": ariaLabel = "Fit page to height",
  children = "Fit height",
  ...props
}: PresetButtonProps) => (
  <PageFitModeButton {...props} aria-label={ariaLabel} mode="height">
    {children}
  </PageFitModeButton>
);

/** Displays pages at their intrinsic pixel dimensions. */
export const ActualSizeButton = ({
  "aria-label": ariaLabel = "Show page at actual size",
  children = "Actual size",
  ...props
}: PresetButtonProps) => (
  <PageFitModeButton {...props} aria-label={ariaLabel} mode="actual">
    {children}
  </PageFitModeButton>
);

export interface PageFitModeControlsProps extends PropsWithChildren {
  "aria-label"?: string;
  className?: string;
}

/** An accessible group of the three built-in page sizing controls. */
export const PageFitModeControls = ({
  "aria-label": ariaLabel = "Page size",
  children,
  className,
}: PageFitModeControlsProps) => (
  <fieldset
    aria-label={ariaLabel}
    className={`pcv-page-fit-mode-controls${className === undefined ? "" : ` ${className}`}`}
  >
    {children ?? (
      <>
        <FitWidthButton />
        <FitHeightButton />
        <ActualSizeButton />
      </>
    )}
  </fieldset>
);
