import type { ComponentPropsWithoutRef, JSX } from "react";

import { composeClassName } from "./class-names";
import type { PageSide, PageTurnDirection } from "./use-viewport-layout";
import type { PageLayout, ViewerSlot } from "./viewer-context";

/** The phase of the page turn in progress, `"idle"` between turns. */
export type PageTurnTransitionState =
  | "idle"
  | "waiting"
  | "prepared"
  | "active";

export interface ViewportTrackProps extends ComponentPropsWithoutRef<"div"> {
  "data-dragging"?: boolean;
  "data-slide-direction"?: PageTurnDirection;
  "data-transition-state"?: PageTurnTransitionState;
}

/** Provides the page-turn rail for a custom Viewport layout. */
export const ViewportTrack = ({
  children,
  className,
  ...props
}: ViewportTrackProps): JSX.Element => (
  <div {...props} className={composeClassName("pcv-viewport-track", className)}>
    {children}
  </div>
);

export interface ViewportPageSetProps extends ComponentPropsWithoutRef<"div"> {
  "data-page-count"?: number;
  /** The side an unpaired page takes; absent while the set holds a spread. */
  "data-page-side"?: PageSide;
  "data-rail-slot"?: "previous" | "current" | "next";
  "data-reading-direction"?: "rtl" | "ltr";
  "data-view-mode"?: "single" | "double";
}

/** Provides one rail slot for a custom Viewport layout. */
export const ViewportPageSet = ({
  children,
  className,
  ...props
}: ViewportPageSetProps): JSX.Element => (
  <div
    {...props}
    className={composeClassName("pcv-viewport-page-set", className)}
  >
    {children}
  </div>
);

export interface ViewportPageSlotProps extends ComponentPropsWithoutRef<"div"> {
  /** Present only for a page that fills a whole spread on its own. */
  "data-page-layout"?: Extract<PageLayout, "spread">;
  "data-page-side"?: PageSide;
  /** The end of the reading sequence an extra page held by the slot sits at. */
  "data-page-slot"?: ViewerSlot;
  /**
   * Present while the page held by the slot is unresolved: `"pending"` while
   * its metadata is on its way, and `"error"` once the resolver rejected.
   */
  "data-page-status"?: "pending" | "error";
  /** The one-based position an extra page takes among the pages of its slot. */
  "data-slot-page"?: number;
  /** How many pages the slot an extra page belongs to holds. */
  "data-slot-page-count"?: number;
  "data-view-mode"?: "single" | "double";
}

/** Provides one visible page slot for a custom Viewport layout. */
export const ViewportPageSlot = ({
  children,
  className,
  ...props
}: ViewportPageSlotProps): JSX.Element => (
  <div
    {...props}
    className={composeClassName("pcv-viewport-page-slot", className)}
  >
    {children}
  </div>
);
