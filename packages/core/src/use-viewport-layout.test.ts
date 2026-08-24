import { describe, expect, it } from "vitest";

import {
  getNextSpreadIndex,
  getPageTurnDirection,
  getPreviousSpreadIndex,
  getSwipeTargetIndex,
  getVisibleIndices,
} from "./use-viewport-layout";

describe(getPageTurnDirection, () => {
  it("maps forward and backward turns to opposite physical directions", () => {
    expect(getPageTurnDirection(0, 1, "ltr")).toBe("left");
    expect(getPageTurnDirection(1, 0, "ltr")).toBe("right");
    expect(getPageTurnDirection(0, 1, "rtl")).toBe("right");
    expect(getPageTurnDirection(1, 0, "rtl")).toBe("left");
  });
});

describe(getVisibleIndices, () => {
  it("returns the single visible page in single mode", () => {
    expect(getVisibleIndices(0, 4, 0, "single")).toStrictEqual([0]);
  });

  it("returns both pages of a spread in double mode", () => {
    expect(getVisibleIndices(0, 4, 0, "double")).toStrictEqual([0, 1]);
  });

  it("returns one page when the spread has no facing page", () => {
    expect(getVisibleIndices(3, 4, 0, "double")).toStrictEqual([3]);
  });

  it("returns one page before the first spread starts", () => {
    expect(getVisibleIndices(0, 4, 1, "double")).toStrictEqual([0]);
  });

  it("returns no page beyond the last one", () => {
    expect(getVisibleIndices(4, 4, 0, "single")).toStrictEqual([]);
  });
});

describe(getNextSpreadIndex, () => {
  it("advances by one page in single mode", () => {
    expect(getNextSpreadIndex(0, 4, 0, "single")).toBe(1);
  });

  it("advances by a whole spread in double mode", () => {
    expect(getNextSpreadIndex(0, 4, 0, "double")).toBe(2);
  });

  it("returns undefined on the last spread", () => {
    expect(getNextSpreadIndex(2, 4, 0, "double")).toBeUndefined();
  });
});

describe(getPreviousSpreadIndex, () => {
  it("returns undefined on the first page", () => {
    expect(getPreviousSpreadIndex(0, 0, "double")).toBeUndefined();
  });

  it("steps back by a whole spread in double mode", () => {
    expect(getPreviousSpreadIndex(2, 0, "double")).toBe(0);
  });

  it("steps back by one page onto a lone pre-spread page", () => {
    expect(getPreviousSpreadIndex(1, 1, "double")).toBe(0);
  });
});

describe(getSwipeTargetIndex, () => {
  it("moves forward on a right swipe in LTR", () => {
    expect(getSwipeTargetIndex("right", 0, 4, "ltr", 0, "single")).toBe(1);
  });

  it("moves forward on a left swipe in RTL", () => {
    expect(getSwipeTargetIndex("left", 0, 4, "rtl", 0, "single")).toBe(1);
  });

  it("returns undefined when no page lies in the swipe direction", () => {
    expect(
      getSwipeTargetIndex("left", 0, 4, "ltr", 0, "single")
    ).toBeUndefined();
  });
});
