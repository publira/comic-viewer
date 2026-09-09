import { describe, expect, it } from "vitest";

import {
  getNextSpreadIndex,
  getPageSide,
  getPageTurnDirection,
  getSwipeTargetIndex,
  getVisibleIndices,
} from "./use-viewport-layout";
import { getPreviousSpreadIndex } from "./viewer-context";
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

const plainPages = createPages(8);
// Pages 1 and 2 pair, page 3 is left facing the blank half before the spread,
// and the pages after it pair again from the sheet the spread ends.
const pagesWithSpread = createPages(8, 3);

describe(getPageTurnDirection, () => {
  it("maps forward and backward turns to opposite physical directions", () => {
    expect(getPageTurnDirection(0, 1, "ltr")).toBe("left");
    expect(getPageTurnDirection(1, 0, "ltr")).toBe("right");
    expect(getPageTurnDirection(0, 1, "rtl")).toBe("right");
    expect(getPageTurnDirection(1, 0, "rtl")).toBe("left");
  });
});

describe(getPageSide, () => {
  it("starts a spread on the side the reading begins on", () => {
    expect(getPageSide(0, 0, "rtl", plainPages)).toBe("right");
    expect(getPageSide(0, 0, "ltr", plainPages)).toBe("left");
  });

  it("faces the page that starts the spread", () => {
    expect(getPageSide(1, 0, "rtl", plainPages)).toBe("left");
    expect(getPageSide(1, 0, "ltr", plainPages)).toBe("right");
  });

  it("places a leading unpaired page opposite the page after it", () => {
    expect(getPageSide(0, 1, "rtl", plainPages)).toBe("left");
    expect(getPageSide(0, 1, "ltr", plainPages)).toBe("right");
    expect(getPageSide(1, 1, "rtl", plainPages)).toBe("right");
    expect(getPageSide(1, 1, "ltr", plainPages)).toBe("left");
  });

  it("starts the spread of a trailing unpaired page", () => {
    expect(getPageSide(5, 1, "rtl", plainPages)).toBe("right");
    expect(getPageSide(5, 1, "ltr", plainPages)).toBe("left");
  });

  it("gives a spread page no side of its own", () => {
    expect(getPageSide(3, 0, "rtl", pagesWithSpread)).toBeUndefined();
    expect(getPageSide(3, 0, "ltr", pagesWithSpread)).toBeUndefined();
  });

  it("keeps the page before a spread on the half it would have in print", () => {
    expect(getPageSide(2, 0, "rtl", pagesWithSpread)).toBe("right");
    expect(getPageSide(2, 0, "ltr", pagesWithSpread)).toBe("left");
  });

  it("keeps the sides of the pages after a spread", () => {
    for (const readingDirection of ["rtl", "ltr"] as const) {
      expect(getPageSide(4, 0, readingDirection, pagesWithSpread)).toBe(
        getPageSide(4, 0, readingDirection, plainPages)
      );
      expect(getPageSide(5, 0, readingDirection, pagesWithSpread)).toBe(
        getPageSide(5, 0, readingDirection, plainPages)
      );
    }
  });
});

describe(getVisibleIndices, () => {
  it("returns the single visible page in single mode", () => {
    expect(getVisibleIndices(0, 3, 0, "single", plainPages)).toStrictEqual([0]);
  });

  it("returns both pages of a spread in double mode", () => {
    expect(getVisibleIndices(0, 3, 0, "double", plainPages)).toStrictEqual([
      0, 1,
    ]);
  });

  it("returns one page when the spread has no facing page", () => {
    expect(getVisibleIndices(3, 3, 0, "double", plainPages)).toStrictEqual([3]);
  });

  it("returns one page before the first spread starts", () => {
    expect(getVisibleIndices(0, 3, 1, "double", plainPages)).toStrictEqual([0]);
  });

  it("returns no page beyond the last one", () => {
    expect(getVisibleIndices(4, 3, 0, "single", plainPages)).toStrictEqual([]);
  });

  it("shows a start page on its own before the spreads", () => {
    expect(getVisibleIndices(-1, 3, 0, "double", plainPages)).toStrictEqual([
      -1,
    ]);
  });

  it("pairs an end page with the page it faces", () => {
    expect(getVisibleIndices(2, 3, 0, "double", plainPages)).toStrictEqual([
      2, 3,
    ]);
  });

  it("gives a spread page a page set of its own", () => {
    expect(getVisibleIndices(3, 7, 0, "double", pagesWithSpread)).toStrictEqual(
      [3]
    );
  });

  it("leaves the page before a spread unpaired", () => {
    expect(getVisibleIndices(2, 7, 0, "double", pagesWithSpread)).toStrictEqual(
      [2]
    );
  });

  it("pairs the pages that follow a spread again", () => {
    expect(getVisibleIndices(4, 7, 0, "double", pagesWithSpread)).toStrictEqual(
      [4, 5]
    );
  });

  it("shows a spread page whole in single mode", () => {
    expect(getVisibleIndices(3, 7, 0, "single", pagesWithSpread)).toStrictEqual(
      [3]
    );
  });
});

describe(getNextSpreadIndex, () => {
  it("advances by one page in single mode", () => {
    expect(getNextSpreadIndex(0, 3, 0, "single", plainPages)).toBe(1);
  });

  it("advances by a whole spread in double mode", () => {
    expect(getNextSpreadIndex(0, 3, 0, "double", plainPages)).toBe(2);
  });

  it("returns undefined on the last spread", () => {
    expect(getNextSpreadIndex(2, 3, 0, "double", plainPages)).toBeUndefined();
  });

  it("advances from a start page onto the first page", () => {
    expect(getNextSpreadIndex(-1, 3, 0, "double", plainPages)).toBe(0);
  });

  it("steps over a spread page as one unit", () => {
    expect(getNextSpreadIndex(2, 7, 0, "double", pagesWithSpread)).toBe(3);
    expect(getNextSpreadIndex(3, 7, 0, "double", pagesWithSpread)).toBe(4);
  });

  it("steps over a spread page as one unit in single mode", () => {
    expect(getNextSpreadIndex(3, 7, 0, "single", pagesWithSpread)).toBe(4);
  });
});

describe(getPreviousSpreadIndex, () => {
  it("returns undefined on the first page", () => {
    expect(
      getPreviousSpreadIndex(0, 0, 0, "double", plainPages)
    ).toBeUndefined();
  });

  it("steps back by a whole spread in double mode", () => {
    expect(getPreviousSpreadIndex(2, 0, 0, "double", plainPages)).toBe(0);
  });

  it("steps back by one page onto a lone pre-spread page", () => {
    expect(getPreviousSpreadIndex(1, 0, 1, "double", plainPages)).toBe(0);
  });

  it("steps back onto the start page", () => {
    expect(getPreviousSpreadIndex(0, -1, 0, "double", plainPages)).toBe(-1);
  });

  it("returns undefined on the start page itself", () => {
    expect(
      getPreviousSpreadIndex(-1, -1, 0, "double", plainPages)
    ).toBeUndefined();
  });

  it("stops at the page the spreads are counted from", () => {
    // An index the spreads are not counted from must not step over the page
    // that starts them, which a start page below it would otherwise absorb.
    expect(getPreviousSpreadIndex(1, -1, 0, "double", plainPages)).toBe(0);
    expect(getPreviousSpreadIndex(1, 0, 0, "double", plainPages)).toBe(0);
  });

  it("steps back onto a spread page as one unit", () => {
    expect(getPreviousSpreadIndex(4, 0, 0, "double", pagesWithSpread)).toBe(3);
  });

  it("steps back from a spread page onto the page left unpaired before it", () => {
    expect(getPreviousSpreadIndex(3, 0, 0, "double", pagesWithSpread)).toBe(2);
  });
});

describe(getSwipeTargetIndex, () => {
  it("moves forward on a right swipe in LTR", () => {
    expect(
      getSwipeTargetIndex("right", 0, 0, 3, "ltr", 0, "single", plainPages)
    ).toBe(1);
  });

  it("moves forward on a left swipe in RTL", () => {
    expect(
      getSwipeTargetIndex("left", 0, 0, 3, "rtl", 0, "single", plainPages)
    ).toBe(1);
  });

  it("returns undefined when no page lies in the swipe direction", () => {
    expect(
      getSwipeTargetIndex("left", 0, 0, 3, "ltr", 0, "single", plainPages)
    ).toBeUndefined();
  });

  it("swipes back onto the start page", () => {
    expect(
      getSwipeTargetIndex("left", 0, -1, 3, "ltr", 0, "single", plainPages)
    ).toBe(-1);
  });

  it("swipes onto a spread page as one unit in both directions", () => {
    expect(
      getSwipeTargetIndex("left", 2, 0, 7, "rtl", 0, "double", pagesWithSpread)
    ).toBe(3);
    expect(
      getSwipeTargetIndex("right", 4, 0, 7, "rtl", 0, "double", pagesWithSpread)
    ).toBe(3);
    expect(
      getSwipeTargetIndex("right", 2, 0, 7, "ltr", 0, "double", pagesWithSpread)
    ).toBe(3);
    expect(
      getSwipeTargetIndex("left", 4, 0, 7, "ltr", 0, "double", pagesWithSpread)
    ).toBe(3);
  });
});
