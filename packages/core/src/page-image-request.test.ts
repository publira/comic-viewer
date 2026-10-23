import { describe, expect, it } from "vitest";

import { getPageImageRequest, getPageRequirement } from "./page-image-request";
import type { ViewerPage } from "./viewer-context";

const portrait: ViewerPage = {
  height: 1000,
  id: "p0",
  src: "page0.png",
  title: "Page 0",
  width: 800,
};
const unsized: ViewerPage = { id: "p1", src: "page1.png", title: "Page 1" };
const spread: ViewerPage = {
  height: 1000,
  id: "p2",
  layout: "spread",
  src: "spread.png",
  title: "Page 2",
  width: 1600,
};
const pages = [portrait, unsized, spread];
const size = { density: 2, height: 500, width: 1200 };

describe(getPageRequirement, () => {
  it("serves the whole slot width in device pixels when fitting the width", () => {
    expect(getPageRequirement(0, pages, size, "width", "single")).toStrictEqual(
      { density: 2, width: 2400 }
    );
    expect(getPageRequirement(0, pages, size, "width", "double")).toStrictEqual(
      { density: 2, width: 1200 }
    );
  });

  it("derives the width from the slot height when fitting the height", () => {
    // 500 CSS pixels tall at 4:5 is 400 wide, narrower than the slot.
    expect(getPageRequirement(0, pages, size, "height", "single").width).toBe(
      800
    );
    // A slot narrower than that bounds the page instead.
    expect(
      getPageRequirement(
        0,
        pages,
        { density: 1, height: 500, width: 600 },
        "height",
        "double"
      ).width
    ).toBe(300);
  });

  it("uses the slot width as the bound for a page of unknown size", () => {
    expect(getPageRequirement(1, pages, size, "height", "double").width).toBe(
      1200
    );
  });

  it("gives a spread page both halves of a double-page slot", () => {
    expect(getPageRequirement(2, pages, size, "width", "double").width).toBe(
      2400
    );
  });

  it("serves an actual-size page at its own width", () => {
    expect(getPageRequirement(0, pages, size, "actual", "double").width).toBe(
      1600
    );
    expect(getPageRequirement(1, pages, size, "actual", "double").width).toBe(
      Number.POSITIVE_INFINITY
    );
  });
});

describe(getPageImageRequest, () => {
  const page: ViewerPage = {
    id: "p0",
    src: "page0.png",
    srcset: "page0@400w.png 400w, page0@800w.png 800w, page0@1600w.png 1600w",
    title: "Page 0",
  };

  it("loads the candidate for the required width", () => {
    expect(getPageImageRequest(page, { density: 1, width: 500 })).toStrictEqual(
      { requirement: { density: 1, width: 500 }, url: "page0@800w.png" }
    );
  });

  it("falls back to src without a usable srcset", () => {
    expect(
      getPageImageRequest(
        { ...page, srcset: "a.png 1x, b.png 800w" },
        { density: 1, width: 500 }
      ).url
    ).toBe("page0.png");
  });

  it("never asks for less than an earlier request did", () => {
    const previous = getPageImageRequest(page, { density: 1, width: 1200 });

    expect(
      getPageImageRequest(page, { density: 2, width: 300 }, previous)
    ).toStrictEqual({
      requirement: { density: 2, width: 1200 },
      url: "page0@1600w.png",
    });
  });
});
