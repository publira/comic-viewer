import { Children, isValidElement } from "react";
import type { ReactNode } from "react";

import type { ViewerSlot } from "./viewer-context";
import { EndPage, StartPage } from "./viewer-slots";

/**
 * The index of the start page nearest the first page of the document, which
 * is the last StartPage written among the children of the viewer. A viewer
 * holding several of them fills the indexes below it as well, down to
 * `minIndex`, so this is no longer the index such a viewer opens on.
 */
export const START_PAGE_INDEX = -1;

/** The extra pages a viewer holds at the ends of its reading sequence. */
export interface ViewerSlotPages {
  endPages: readonly ReactNode[];
  startPages: readonly ReactNode[];
}

/** One of the extra pages, together with its place among the slot it fills. */
export interface ViewerSlotPage {
  /** How many pages the slot holds. */
  count: number;
  /** The content written for this position of the slot. */
  page: ReactNode;
  /** The one-based position the page takes among the pages of its slot. */
  position: number;
  slot: ViewerSlot;
}

/**
 * Returns the extra page a navigable index addresses, or `undefined` for an
 * index that addresses a page of the document. The start pages take the
 * indexes below the page list, `-1` being the last one written, and the end
 * pages the indexes above it, `pageCount` being the first one written, so the
 * reading order follows the order they are written in.
 */
export const getSlotPage = (
  index: number,
  pageCount: number,
  { endPages, startPages }: ViewerSlotPages
): ViewerSlotPage | undefined => {
  if (index < 0) {
    const position = startPages.length + index + 1;

    return position < 1
      ? undefined
      : {
          count: startPages.length,
          page: startPages[position - 1],
          position,
          slot: "start",
        };
  }

  if (index < pageCount) {
    return undefined;
  }

  const position = index - pageCount + 1;

  return position > endPages.length
    ? undefined
    : {
        count: endPages.length,
        page: endPages[position - 1],
        position,
        slot: "end",
      };
};

/**
 * Returns the slot a navigable index belongs to, or `undefined` for an index
 * that addresses a page of the document.
 */
export const getPageSlot = (
  index: number,
  pageCount: number,
  slotPages: ViewerSlotPages
): ViewerSlot | undefined => getSlotPage(index, pageCount, slotPages)?.slot;

export interface ViewerSlotChildren extends ViewerSlotPages {
  /** The children left once the slot pages are taken out of the tree. */
  children: ReactNode;
}

/**
 * Splits the children of the viewer root into its slot pages and the rest of
 * the tree, so that a StartPage or an EndPage written as a child reaches the
 * rail instead of being rendered where it stands.
 */
export const extractViewerSlotPages = (
  children: ReactNode
): ViewerSlotChildren => {
  const endPages: ReactNode[] = [];
  const startPages: ReactNode[] = [];

  // oxlint-disable-next-line react/no-react-children -- Only Children enumerates the root children without losing the keys they are rendered with.
  const rest = Children.toArray(children).filter((child) => {
    if (!isValidElement(child)) {
      return true;
    }

    // A slot holds as many pages as it is given, each of them a page of its
    // own, in the order they are written.
    if (child.type === StartPage) {
      startPages.push(child);

      return false;
    }

    if (child.type === EndPage) {
      endPages.push(child);

      return false;
    }

    return true;
  });

  return { children: rest, endPages, startPages };
};
