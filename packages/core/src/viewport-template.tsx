import { isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactElement } from "react";

import { composeClassName } from "./class-names";
import type { PageSide, PageTurnDirection } from "./use-viewport-layout";
import type { ViewerPage } from "./viewer-context";
import type { ViewportChildren } from "./viewport-page";

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
}: ViewportPageSetProps) => (
  <div
    {...props}
    className={composeClassName("pcv-viewport-page-set", className)}
  >
    {children}
  </div>
);

export interface ViewportPageSlotProps extends ComponentPropsWithoutRef<"div"> {
  "data-page-side"?: PageSide;
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
    className={composeClassName("pcv-viewport-page-slot", className)}
  >
    {children}
  </div>
);

export interface ViewportLayoutTemplate<TPage extends ViewerPage> {
  pageSet: ReactElement<ViewportPageSetProps>;
  pageSlot: ReactElement<ViewportPageSlotProps>;
  pageTemplate: ViewportChildren<TPage> | undefined;
  track: ReactElement<ViewportTrackProps>;
}

/** Reads the optional track, page-set, and page-slot templates from Viewport children. */
export const getViewportLayoutTemplate = <TPage extends ViewerPage>(
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
