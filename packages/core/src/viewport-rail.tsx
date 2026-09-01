import { cloneElement, Fragment } from "react";
import type {
  CSSProperties,
  ReactNode,
  TransitionEvent as ReactTransitionEvent,
} from "react";

import { getPageImageKey } from "./use-viewport-images";
import type { PageImage, PageLoadEntry } from "./use-viewport-images";
import { getPageSide } from "./use-viewport-layout";
import type { PageSide, PageTurnDirection } from "./use-viewport-layout";
import { getPageSlot } from "./viewer-context";
import type { ViewerPage } from "./viewer-context";
import { ViewerSlotProvider } from "./viewer-slots";
import { ViewportPageInstance, ViewportPendingPage } from "./viewport-page";
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
  endPage: ReactNode;
  getPageIndices: (spreadIndex: number) => number[];
  isDragging: boolean;
  layoutTemplate: ViewportLayoutTemplate<TPage> | undefined;
  onTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void;
  pageCount: number;
  pageImages: ReadonlyMap<string, PageImage>;
  pageLoadStates: ReadonlyMap<string, PageLoadEntry<TPage>>;
  pageTemplate: ViewportChildren<TPage> | undefined;
  pages: readonly (TPage | undefined)[];
  railSpreadIndices: readonly (number | undefined)[];
  readingDirection: "rtl" | "ltr";
  renderPage: ((page: TPage, index: number) => ReactNode) | undefined;
  renderPendingPage: ((index: number) => ReactNode) | undefined;
  retryPage: (index: number) => void;
  slideDirection: PageTurnDirection | undefined;
  spreadStartIndex: number;
  startPage: ReactNode;
  transitionState: "idle" | "waiting" | "prepared" | "active";
  viewMode: "single" | "double";
}

/** Renders the previous, current, and next spreads into the page-turn rail. */
export const ViewportRail = <TPage extends ViewerPage>({
  activePan,
  activeZoom,
  dragOffset,
  endPage,
  getPageIndices,
  isDragging,
  layoutTemplate,
  onTransitionEnd,
  pageCount,
  pageImages,
  pageLoadStates,
  pageTemplate,
  pages,
  railSpreadIndices,
  readingDirection,
  renderPage,
  renderPendingPage,
  retryPage,
  slideDirection,
  spreadStartIndex,
  startPage,
  transitionState,
  viewMode,
}: ViewportRailProps<TPage>) => {
  const trackTemplate = layoutTemplate?.track;
  const pageSetTemplate = layoutTemplate?.pageSet;
  const pageSlotTemplate = layoutTemplate?.pageSlot;
  // Only a spread has two halves, so a page takes a side in double-page mode
  // alone.
  const getSide = (index: number): PageSide | undefined =>
    viewMode === "double"
      ? getPageSide(index, spreadStartIndex, readingDirection)
      : undefined;
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
    const pageIndices =
      spreadIndex === undefined ? [] : getPageIndices(spreadIndex);
    const pageSetProps = {
      "aria-hidden": slot !== 1 || undefined,
      "data-page-count": pageIndices.length,
      // An unpaired page still belongs to one half of the spread, and the set
      // is the only element that can place it there for every page template.
      "data-page-side":
        pageIndices.length === 1 ? getSide(pageIndices[0]) : undefined,
      "data-rail-slot": getRailSlotName(slot),
      "data-reading-direction": readingDirection,
      "data-view-mode": viewMode,
      style: pageSetStyle,
    };
    const pageInstances =
      spreadIndex === undefined
        ? null
        : pageIndices.map((index) => {
            const page = pages[index];
            const side = getSide(index);
            const pageSlot = getPageSlot(index, pageCount, {
              endPage,
              startPage,
            });
            let pageInstance: ReactNode;

            if (pageSlot !== undefined) {
              // A slot page renders content of its own, so the rail only
              // places it in the spread.
              pageInstance = (
                <ViewerSlotProvider side={side} slot={pageSlot}>
                  {pageSlot === "start" ? startPage : endPage}
                </ViewerSlotProvider>
              );
            } else if (page === undefined) {
              // The page keeps its place in the spread while its metadata is
              // still being resolved.
              pageInstance =
                renderPendingPage === undefined ? (
                  <ViewportPendingPage data-page-side={side} />
                ) : (
                  renderPendingPage(index)
                );
            } else {
              const imageKey = getPageImageKey(index, page);
              const loadState = pageLoadStates.get(imageKey);
              pageInstance = (
                <ViewportPageInstance
                  error={loadState?.error}
                  image={pageImages.get(imageKey)}
                  index={index}
                  page={page}
                  renderPage={renderPage}
                  retryPage={retryPage}
                  side={side}
                  status={loadState?.status ?? "idle"}
                >
                  {pageTemplate}
                </ViewportPageInstance>
              );
            }

            if (pageSlotTemplate === undefined) {
              return <Fragment key={index}>{pageInstance}</Fragment>;
            }

            // oxlint-disable-next-line react/no-clone-element -- The page slot is a public layout template instantiated for each visible page.
            return cloneElement(
              pageSlotTemplate,
              {
                "data-page-side": side,
                "data-page-slot": pageSlot,
                "data-page-status":
                  pageSlot === undefined && page === undefined
                    ? "pending"
                    : undefined,
                "data-view-mode": viewMode,
                key: index,
              },
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
