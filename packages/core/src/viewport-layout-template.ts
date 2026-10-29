import { isValidElement } from "react";
import type { ReactElement } from "react";

import type { ViewerPage } from "./viewer-context";
import type { ViewportChildren } from "./viewport-page";
import {
  ViewportPageSet,
  ViewportPageSlot,
  ViewportTrack,
} from "./viewport-template";
import type {
  ViewportPageSetProps,
  ViewportPageSlotProps,
  ViewportTrackProps,
} from "./viewport-template";

/** A ViewportPageSlot in a layout template, which holds the page template. */
type ViewportPageSlotTemplateProps<TPage extends ViewerPage> = Omit<
  ViewportPageSlotProps,
  "children"
> & { children?: ViewportChildren<TPage> };

export interface ViewportLayoutTemplate<TPage extends ViewerPage> {
  pageSet: ReactElement<ViewportPageSetProps>;
  pageSlot: ReactElement<ViewportPageSlotTemplateProps<TPage>>;
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
    !isValidElement<ViewportPageSlotTemplateProps<TPage>>(pageSlot) ||
    pageSlot.type !== ViewportPageSlot
  ) {
    throw new Error(
      "ViewportPageSet must contain exactly one ViewportPageSlot template."
    );
  }

  return {
    pageSet,
    pageSlot,
    pageTemplate: pageSlot.props.children,
    track: children,
  };
};
