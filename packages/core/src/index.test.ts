import { describe, expect, it } from "vitest";

import { ComicViewer, Root } from "./index";

describe("index exports", () => {
  it("exports Root as the same component as ComicViewer", () => {
    expect(Root).toBe(ComicViewer);
  });
});
