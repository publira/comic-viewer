import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";

import packageJson from "../package.json" with { type: "json" };

// Importing the stylesheet fails the whole test file when it stops resolving.
import "@publira/comic-viewer/default.css";

// Vite rewrites `new URL(path, import.meta.url)` written out literally.
const testFileUrl = import.meta.url;
// turbo.json builds dist before this file runs; a bare vitest run may see a stale one.
const builtEntry = new URL(`../${packageJson.module}`, testFileUrl);
const declarationEntry = new URL(`../${packageJson.types}`, testFileUrl);
const sourceEntry = new URL("index.ts", testFileUrl);

// Vite's `?raw` query reads the file as text, so no Node.js types are needed.
const declaredExportNames = async (entry: URL): Promise<Set<string | null>> => {
  const { default: sourceText }: { default: string } = await import(
    `${entry.href}?raw`
  );
  const { errors, module } = parseSync(entry.pathname, sourceText);

  if (errors.length > 0) {
    throw new Error(`${entry.pathname} does not parse.`);
  }

  return new Set(
    module.staticExports.flatMap(({ entries }) =>
      entries.map(({ exportName }) => exportName.name)
    )
  );
};

describe("package exports", () => {
  it("exposes only the entry points the versioning policy covers", () => {
    expect(Object.keys(packageJson.exports)).toStrictEqual([
      ".",
      "./default.css",
    ]);
  });

  it("ships the stylesheet default.css points at", () => {
    expect(packageJson.files).toContain(
      packageJson.exports["./default.css"].replace("./", "")
    );
  });

  it("declares exactly the names the source entry exports", async () => {
    await expect(declaredExportNames(declarationEntry)).resolves.toStrictEqual(
      await declaredExportNames(sourceEntry)
    );
  });

  it("bundles exactly the values the source entry exports", async () => {
    const source = await import("./index");
    const built: object = await import(builtEntry.href);

    expect(new Set(Object.keys(built))).toStrictEqual(
      new Set(Object.keys(source))
    );
  });
});
