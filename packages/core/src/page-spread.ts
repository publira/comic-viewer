import type { ViewerPage } from "./viewer-context";

/**
 * The page list a grouping is read from. An entry is `undefined` while the
 * page is unresolved, and an index outside the list belongs to a start or an
 * end page, neither of which can be a spread.
 */
export type SpreadPageList = readonly (ViewerPage | undefined)[];

/** Whether the page at an index fills a whole two-page spread on its own. */
export const isSpreadPage = (index: number, pages: SpreadPageList): boolean =>
  pages[index]?.layout === "spread";

/**
 * Returns how many halves of the printed sheet lie between `spreadStartIndex`
 * and a page. An ordinary page takes one half, and a spread page takes both
 * halves of a sheet of its own, so a spread reached in the middle of a sheet
 * moves on to the next one and leaves the half before it blank.
 *
 * An even offset therefore marks a page that opens a sheet, which is the page
 * its whole page set is addressed by, and an odd one the page facing it. The
 * pages before `spreadStartIndex` are each shown on their own and keep the
 * plain parity of their distance from it.
 */
export const getPageSetOffset = (
  index: number,
  spreadStartIndex: number,
  pages: SpreadPageList
): number => {
  if (index <= spreadStartIndex) {
    return index - spreadStartIndex;
  }

  let offset = 0;
  for (let page = spreadStartIndex; page < index; page += 1) {
    // A spread that lands mid-sheet costs the blank half before it as well.
    offset += isSpreadPage(page, pages) ? 2 + (offset % 2) : 1;
  }

  return isSpreadPage(index, pages) ? offset + (offset % 2) : offset;
};

/** Whether a page opens the page set it belongs to rather than facing it. */
export const startsPageSet = (
  index: number,
  spreadStartIndex: number,
  pages: SpreadPageList
): boolean => getPageSetOffset(index, spreadStartIndex, pages) % 2 === 0;
