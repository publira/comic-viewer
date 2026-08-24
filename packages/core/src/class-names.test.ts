import { describe, expect, it } from "vitest";

import { composeClassName } from "./class-names";

describe(composeClassName, () => {
  it("returns the required class when no consumer class is supplied", () => {
    expect(composeClassName("pcv-root")).toBe("pcv-root");
  });

  it("appends a consumer class after the required class", () => {
    expect(composeClassName("pcv-root", "reader theme-dark")).toBe(
      "pcv-root reader theme-dark"
    );
  });
});
