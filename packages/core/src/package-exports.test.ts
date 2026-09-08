import { describe, expect, it } from "vitest";

import packageJson from "../package.json" with { type: "json" };

// Importing both subpaths fails the whole test file when either one stops
// resolving, which is what keeps the deprecated alias from silently breaking.
import "@publira/comic-viewer/core.css";
import "@publira/comic-viewer/default.css";

describe("package exports", () => {
  it("exports default.css and the deprecated core.css alias from one file", () => {
    expect(packageJson.exports["./core.css"]).toBe(
      packageJson.exports["./default.css"]
    );
  });

  it("ships the stylesheet the subpaths point at", () => {
    expect(packageJson.files).toContain(
      packageJson.exports["./default.css"].replace("./", "")
    );
  });
});
