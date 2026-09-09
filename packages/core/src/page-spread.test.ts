import { describe, expect, it } from "vitest";

import { getPageSetOffset, isSpreadPage, startsPageSet } from "./page-spread";
import type { ViewerPage } from "./viewer-context";

/** A page list of `count` pages, with a spread page at each given index. */
const createPages = (
  count: number,
  ...spreadIndices: readonly number[]
): ViewerPage[] =>
  Array.from({ length: count }, (_unused, index) => ({
    id: `p${index}`,
    layout: spreadIndices.includes(index) ? ("spread" as const) : undefined,
    src: `page${index}.png`,
    title: `Page ${index + 1}`,
  }));

describe(isSpreadPage, () => {
  it("reports the pages declared as a spread", () => {
    const pages = createPages(4, 2);

    expect(isSpreadPage(2, pages)).toBeTruthy();
    expect(isSpreadPage(1, pages)).toBeFalsy();
  });

  it("reports no spread for an unresolved page or a slot index", () => {
    const pages: (ViewerPage | undefined)[] = [undefined, ...createPages(1, 0)];

    expect(isSpreadPage(0, pages)).toBeFalsy();
    expect(isSpreadPage(-1, pages)).toBeFalsy();
    expect(isSpreadPage(9, pages)).toBeFalsy();
  });
});

describe(getPageSetOffset, () => {
  it("counts one half of a sheet per ordinary page", () => {
    const pages = createPages(4);

    expect(getPageSetOffset(0, 0, pages)).toBe(0);
    expect(getPageSetOffset(1, 0, pages)).toBe(1);
    expect(getPageSetOffset(2, 0, pages)).toBe(2);
  });

  it("keeps the plain parity of the pages before the spreads start", () => {
    const pages = createPages(4);

    expect(getPageSetOffset(0, 2, pages)).toBe(-2);
    expect(getPageSetOffset(1, 2, pages)).toBe(-1);
  });

  it("gives a spread page both halves of a sheet", () => {
    const pages = createPages(4, 0);

    expect(getPageSetOffset(0, 0, pages)).toBe(0);
    expect(getPageSetOffset(1, 0, pages)).toBe(2);
    expect(getPageSetOffset(2, 0, pages)).toBe(3);
  });

  it("moves a spread reached mid-sheet on to the next one", () => {
    const pages = createPages(6, 3);

    // Page 3 opens a sheet, so the spread cannot share it and starts the
    // sheet after it, leaving the second half of that one blank.
    expect(getPageSetOffset(2, 0, pages)).toBe(2);
    expect(getPageSetOffset(3, 0, pages)).toBe(4);
    expect(getPageSetOffset(4, 0, pages)).toBe(6);
  });

  it("keeps the pages after a spread on the halves print gives them", () => {
    const plainPages = createPages(8);
    const pagesWithSpread = createPages(8, 3);

    for (const index of [4, 5, 6, 7]) {
      expect(getPageSetOffset(index, 0, pagesWithSpread) % 2).toBe(
        getPageSetOffset(index, 0, plainPages) % 2
      );
    }
  });
});

describe(startsPageSet, () => {
  it("marks every other page from the one the spreads are counted from", () => {
    const pages = createPages(4);

    expect(startsPageSet(1, 1, pages)).toBeTruthy();
    expect(startsPageSet(2, 1, pages)).toBeFalsy();
    expect(startsPageSet(3, 1, pages)).toBeTruthy();
  });

  it("marks a spread page and the page left unpaired before it", () => {
    const pages = createPages(6, 3);

    expect(startsPageSet(2, 0, pages)).toBeTruthy();
    expect(startsPageSet(3, 0, pages)).toBeTruthy();
    expect(startsPageSet(4, 0, pages)).toBeTruthy();
    expect(startsPageSet(5, 0, pages)).toBeFalsy();
  });
});
