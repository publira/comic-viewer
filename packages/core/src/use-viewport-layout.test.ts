import { describe, expect, it } from "vitest";

import {
  getNextSpreadIndex,
  getPageSide,
  getPageTurnDirection,
  getSwipeTargetIndex,
  getVisibleIndices,
} from "./use-viewport-layout";
import { getPreviousSpreadIndex } from "./viewer-context";

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
    expect(getPageSide(0, 0, "rtl")).toBe("right");
    expect(getPageSide(0, 0, "ltr")).toBe("left");
  });

  it("faces the page that starts the spread", () => {
    expect(getPageSide(1, 0, "rtl")).toBe("left");
    expect(getPageSide(1, 0, "ltr")).toBe("right");
  });

  it("places a leading unpaired page opposite the page after it", () => {
    expect(getPageSide(0, 1, "rtl")).toBe("left");
    expect(getPageSide(0, 1, "ltr")).toBe("right");
    expect(getPageSide(1, 1, "rtl")).toBe("right");
    expect(getPageSide(1, 1, "ltr")).toBe("left");
  });

  it("starts the spread of a trailing unpaired page", () => {
    expect(getPageSide(5, 1, "rtl")).toBe("right");
    expect(getPageSide(5, 1, "ltr")).toBe("left");
  });
});

describe(getVisibleIndices, () => {
  it("returns the single visible page in single mode", () => {
    expect(getVisibleIndices(0, 3, 0, "single")).toStrictEqual([0]);
  });

  it("returns both pages of a spread in double mode", () => {
    expect(getVisibleIndices(0, 3, 0, "double")).toStrictEqual([0, 1]);
  });

  it("returns one page when the spread has no facing page", () => {
    expect(getVisibleIndices(3, 3, 0, "double")).toStrictEqual([3]);
  });

  it("returns one page before the first spread starts", () => {
    expect(getVisibleIndices(0, 3, 1, "double")).toStrictEqual([0]);
  });

  it("returns no page beyond the last one", () => {
    expect(getVisibleIndices(4, 3, 0, "single")).toStrictEqual([]);
  });

  it("shows a start page on its own before the spreads", () => {
    expect(getVisibleIndices(-1, 3, 0, "double")).toStrictEqual([-1]);
  });

  it("pairs an end page with the page it faces", () => {
    expect(getVisibleIndices(2, 3, 0, "double")).toStrictEqual([2, 3]);
  });
});

describe(getNextSpreadIndex, () => {
  it("advances by one page in single mode", () => {
    expect(getNextSpreadIndex(0, 3, 0, "single")).toBe(1);
  });

  it("advances by a whole spread in double mode", () => {
    expect(getNextSpreadIndex(0, 3, 0, "double")).toBe(2);
  });

  it("returns undefined on the last spread", () => {
    expect(getNextSpreadIndex(2, 3, 0, "double")).toBeUndefined();
  });

  it("advances from a start page onto the first page", () => {
    expect(getNextSpreadIndex(-1, 3, 0, "double")).toBe(0);
  });
});

describe(getPreviousSpreadIndex, () => {
  it("returns undefined on the first page", () => {
    expect(getPreviousSpreadIndex(0, 0, 0, "double")).toBeUndefined();
  });

  it("steps back by a whole spread in double mode", () => {
    expect(getPreviousSpreadIndex(2, 0, 0, "double")).toBe(0);
  });

  it("steps back by one page onto a lone pre-spread page", () => {
    expect(getPreviousSpreadIndex(1, 0, 1, "double")).toBe(0);
  });

  it("steps back onto the start page", () => {
    expect(getPreviousSpreadIndex(0, -1, 0, "double")).toBe(-1);
  });

  it("returns undefined on the start page itself", () => {
    expect(getPreviousSpreadIndex(-1, -1, 0, "double")).toBeUndefined();
  });

  it("stops at the page the spreads are counted from", () => {
    // An index the spreads are not counted from must not step over the page
    // that starts them, which a start page below it would otherwise absorb.
    expect(getPreviousSpreadIndex(1, -1, 0, "double")).toBe(0);
    expect(getPreviousSpreadIndex(1, 0, 0, "double")).toBe(0);
  });
});

describe(getSwipeTargetIndex, () => {
  it("moves forward on a right swipe in LTR", () => {
    expect(getSwipeTargetIndex("right", 0, 0, 3, "ltr", 0, "single")).toBe(1);
  });

  it("moves forward on a left swipe in RTL", () => {
    expect(getSwipeTargetIndex("left", 0, 0, 3, "rtl", 0, "single")).toBe(1);
  });

  it("returns undefined when no page lies in the swipe direction", () => {
    expect(
      getSwipeTargetIndex("left", 0, 0, 3, "ltr", 0, "single")
    ).toBeUndefined();
  });

  it("swipes back onto the start page", () => {
    expect(getSwipeTargetIndex("left", 0, -1, 3, "ltr", 0, "single")).toBe(-1);
  });
});
