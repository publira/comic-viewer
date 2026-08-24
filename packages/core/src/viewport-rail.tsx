import { cloneElement } from "react";
import type {
  CSSProperties,
  ReactNode,
  TransitionEvent as ReactTransitionEvent,
} from "react";

import { getPageImageKey } from "./use-viewport-images";
import type { PageImage, PageLoadEntry } from "./use-viewport-images";
import type { PageTurnDirection } from "./use-viewport-layout";
import type { ViewerPage } from "./viewer-context";
import { ViewportPageInstance } from "./viewport-page";
import type { ViewportChildren } from "./viewport-page";
import { ViewportPageSet, ViewportTrack } from "./viewport-template";
import type {
  ViewportLayoutTemplate,
  ViewportTrackProps,
} from "./viewport-template";

const getRailSlotName = (slot: number): "previous" | "current" | "next" => {
  if (slot === 0) {
    return "previous";
  }

  return slot === 1 ? "current" : "next";
};

interface ViewportRailProps<TPage extends ViewerPage> {
  activePan: { x: number; y: number };
  activeZoom: { scale: number };
  dragOffset: number;
  getPageIndices: (spreadIndex: number) => number[];
  isDragging: boolean;
  layoutTemplate: ViewportLayoutTemplate<TPage> | undefined;
  onTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void;
  pageImages: ReadonlyMap<string, PageImage>;
  pageLoadStates: ReadonlyMap<string, PageLoadEntry<TPage>>;
  pageTemplate: ViewportChildren<TPage> | undefined;
  pages: readonly TPage[];
  railSpreadIndices: readonly (number | undefined)[];
  readingDirection: "rtl" | "ltr";
  renderPage: ((page: TPage, index: number) => ReactNode) | undefined;
  retryPage: (index: number) => void;
  slideDirection: PageTurnDirection | undefined;
  transitionState: "idle" | "waiting" | "prepared" | "active";
  viewMode: "single" | "double";
}

/** Renders the previous, current, and next spreads into the page-turn rail. */
export const ViewportRail = <TPage extends ViewerPage>({
  activePan,
  activeZoom,
  dragOffset,
  getPageIndices,
  isDragging,
  layoutTemplate,
  onTransitionEnd,
  pageImages,
  pageLoadStates,
  pageTemplate,
  pages,
  railSpreadIndices,
  readingDirection,
  renderPage,
  retryPage,
  slideDirection,
  transitionState,
  viewMode,
}: ViewportRailProps<TPage>) => {
  const trackTemplate = layoutTemplate?.track;
  const pageSetTemplate = layoutTemplate?.pageSet;
  const pageSlotTemplate = layoutTemplate?.pageSlot;
  const pageSets = railSpreadIndices.map((spreadIndex, slot) => {
    const pageSetStyle =
      slot === 1
        ? ({
            ...pageSetTemplate?.props.style,
            "--pcv-pan-x": `${activePan.x}px`,
            "--pcv-pan-y": `${activePan.y}px`,
            "--pcv-zoom-scale": activeZoom.scale,
          } as CSSProperties)
        : pageSetTemplate?.props.style;
    const pageSetProps = {
      "aria-hidden": slot !== 1 || undefined,
      "data-page-count":
        spreadIndex === undefined ? 0 : getPageIndices(spreadIndex).length,
      "data-rail-slot": getRailSlotName(slot),
      "data-reading-direction": readingDirection,
      "data-view-mode": viewMode,
      style: pageSetStyle,
    };
    const pageInstances =
      spreadIndex === undefined
        ? null
        : getPageIndices(spreadIndex).map((index) => {
            const page = pages[index];
            if (page === undefined) {
              return null;
            }

            const imageKey = getPageImageKey(index, page);
            const loadState = pageLoadStates.get(imageKey);
            const pageInstance = (
              <ViewportPageInstance
                key={index}
                error={loadState?.error}
                image={pageImages.get(imageKey)}
                index={index}
                page={page}
                renderPage={renderPage}
                retryPage={retryPage}
                status={loadState?.status ?? "idle"}
              >
                {pageTemplate}
              </ViewportPageInstance>
            );

            if (pageSlotTemplate === undefined) {
              return pageInstance;
            }

            // oxlint-disable-next-line react/no-clone-element -- The page slot is a public layout template instantiated for each visible page.
            return cloneElement(
              pageSlotTemplate,
              { "data-view-mode": viewMode, key: index },
              pageInstance
            );
          });

    if (pageSetTemplate === undefined) {
      return (
        <ViewportPageSet key={slot} {...pageSetProps}>
          {pageInstances}
        </ViewportPageSet>
      );
    }

    // oxlint-disable-next-line react/no-clone-element -- The page set is a public layout template instantiated for each rail slot.
    return cloneElement(
      pageSetTemplate,
      { ...pageSetProps, key: slot },
      pageInstances
    );
  });
  const trackStyle = {
    ...trackTemplate?.props.style,
    "--pcv-drag-offset": `${dragOffset}px`,
  } as CSSProperties;
  const trackProps: Partial<ViewportTrackProps> = {
    "data-dragging": isDragging || undefined,
    "data-slide-direction": slideDirection,
    "data-transition-state": transitionState,
    onTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => {
      trackTemplate?.props.onTransitionEnd?.(event);
      onTransitionEnd(event);
    },
    style: trackStyle,
  };

  if (trackTemplate === undefined) {
    return <ViewportTrack {...trackProps}>{pageSets}</ViewportTrack>;
  }

  // oxlint-disable-next-line react/no-clone-element -- The track is a public layout template filled by the managed rail.
  return cloneElement(trackTemplate, trackProps, pageSets);
};
