import { describe, expect, it } from "vitest";

import { parseSrcset, selectSrcsetCandidate } from "./page-srcset";

describe(parseSrcset, () => {
  it("parses a list of w candidates", () => {
    expect(parseSrcset("p@800.jpg 800w, p@1600.jpg 1600w")).toStrictEqual({
      candidates: [
        { url: "p@800.jpg", width: 800 },
        { url: "p@1600.jpg", width: 1600 },
      ],
      kind: "width",
    });
  });

  it("parses a list of x candidates, including fractional densities", () => {
    expect(parseSrcset("p.jpg 1x, p@1.5.jpg 1.5x, p@2.jpg 2x")).toStrictEqual({
      candidates: [
        { density: 1, url: "p.jpg" },
        { density: 1.5, url: "p@1.5.jpg" },
        { density: 2, url: "p@2.jpg" },
      ],
      kind: "density",
    });
  });

  it("counts a candidate without a descriptor as 1x", () => {
    expect(parseSrcset("p.jpg, p@2.jpg 2x")).toStrictEqual({
      candidates: [
        { density: 1, url: "p.jpg" },
        { density: 2, url: "p@2.jpg" },
      ],
      kind: "density",
    });
    expect(parseSrcset("p.jpg")).toStrictEqual({
      candidates: [{ density: 1, url: "p.jpg" }],
      kind: "density",
    });
  });

  it("keeps a comma inside a URL", () => {
    expect(
      parseSrcset("/img/w_800,q_80/p.jpg 800w, /img/w_1600,q_80/p.jpg 1600w")
    ).toStrictEqual({
      candidates: [
        { url: "/img/w_800,q_80/p.jpg", width: 800 },
        { url: "/img/w_1600,q_80/p.jpg", width: 1600 },
      ],
      kind: "width",
    });
  });

  it("tolerates trailing commas and extra whitespace", () => {
    expect(
      parseSrcset(
        "  p@800.jpg   800w ,\n\tp@1600.jpg 1600w,, p@2400.jpg 2400w, "
      )
    ).toStrictEqual({
      candidates: [
        { url: "p@800.jpg", width: 800 },
        { url: "p@1600.jpg", width: 1600 },
        { url: "p@2400.jpg", width: 2400 },
      ],
      kind: "width",
    });
  });

  it("drops a candidate whose descriptor is malformed", () => {
    expect(
      parseSrcset(
        "p@800.jpg 800w, p@1200.jpg 1200px, p@0.jpg 0w, p@1400.jpg 1400w 1400w, p@1600.jpg 1600w"
      )
    ).toStrictEqual({
      candidates: [
        { url: "p@800.jpg", width: 800 },
        { url: "p@1600.jpg", width: 1600 },
      ],
      kind: "width",
    });
    expect(parseSrcset("p.jpg -1x, p@2.jpg 2x, p@3.jpg 3.x")).toStrictEqual({
      candidates: [{ density: 2, url: "p@2.jpg" }],
      kind: "density",
    });
  });

  it("accepts the reserved h descriptor only beside a w one", () => {
    expect(parseSrcset("p@800.jpg 800w 1200h, p@1600.jpg 1200h")).toStrictEqual(
      {
        candidates: [{ url: "p@800.jpg", width: 800 }],
        kind: "width",
      }
    );
  });

  it("treats a list that mixes w and x descriptors as invalid", () => {
    expect(parseSrcset("p@800.jpg 800w, p@2.jpg 2x")).toBeUndefined();
    expect(parseSrcset("p@800.jpg 800w, p.jpg")).toBeUndefined();
  });

  it("yields nothing for an empty list or one with no valid candidate", () => {
    expect(parseSrcset("")).toBeUndefined();
    expect(parseSrcset(" , ")).toBeUndefined();
    expect(parseSrcset("p.jpg 800q")).toBeUndefined();
  });
});

describe(selectSrcsetCandidate, () => {
  const widths = "p@800.jpg 800w, p@2400.jpg 2400w, p@1600.jpg 1600w";
  const densities = "p.jpg 1x, p@3.jpg 3x, p@1.5.jpg 1.5x";

  it("picks the smallest w candidate at or above the required width", () => {
    expect(selectSrcsetCandidate(widths, { density: 1, width: 1000 })).toBe(
      "p@1600.jpg"
    );
    expect(selectSrcsetCandidate(widths, { density: 1, width: 1600 })).toBe(
      "p@1600.jpg"
    );
  });

  it("picks the smallest w candidate when the required width is below all", () => {
    expect(selectSrcsetCandidate(widths, { density: 1, width: 300 })).toBe(
      "p@800.jpg"
    );
  });

  it("picks the largest w candidate when the required width is above all", () => {
    expect(selectSrcsetCandidate(widths, { density: 1, width: 4000 })).toBe(
      "p@2400.jpg"
    );
  });

  it("picks the smallest x candidate at or above the required density", () => {
    expect(selectSrcsetCandidate(densities, { density: 1, width: 0 })).toBe(
      "p.jpg"
    );
    expect(selectSrcsetCandidate(densities, { density: 1.25, width: 0 })).toBe(
      "p@1.5.jpg"
    );
    expect(selectSrcsetCandidate(densities, { density: 2, width: 0 })).toBe(
      "p@3.jpg"
    );
  });

  it("picks the highest x candidate when the required density is above all", () => {
    expect(selectSrcsetCandidate(densities, { density: 4, width: 0 })).toBe(
      "p@3.jpg"
    );
  });

  it("prefers the first of equal candidates", () => {
    expect(
      selectSrcsetCandidate("a.jpg 800w, b.jpg 800w", {
        density: 1,
        width: 800,
      })
    ).toBe("a.jpg");
  });

  it("yields nothing for an absent, empty, or invalid list", () => {
    const requirement = { density: 1, width: 1000 };

    expect(selectSrcsetCandidate(undefined, requirement)).toBeUndefined();
    expect(selectSrcsetCandidate("", requirement)).toBeUndefined();
    expect(
      selectSrcsetCandidate("p@800.jpg 800w, p@2.jpg 2x", requirement)
    ).toBeUndefined();
  });
});
