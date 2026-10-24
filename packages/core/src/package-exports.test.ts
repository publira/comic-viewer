import ts from "typescript";
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

const declaredExportNames = (...entries: URL[]) => {
  const fileNames = entries.map(({ pathname }) => decodeURIComponent(pathname));
  const program = ts.createProgram(fileNames, {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
  });
  const checker = program.getTypeChecker();

  return fileNames.map((fileName) => {
    const sourceFile = program.getSourceFile(fileName);
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);

    if (moduleSymbol === undefined) {
      throw new Error(`${fileName} is not a module.`);
    }

    return new Set(
      checker.getExportsOfModule(moduleSymbol).map(({ name }) => name)
    );
  });
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

  it("declares exactly the names the source entry exports", () => {
    const [sourceNames, declaredNames] = declaredExportNames(
      sourceEntry,
      declarationEntry
    );

    expect(declaredNames).toStrictEqual(sourceNames);
  });

  it("bundles exactly the values the source entry exports", async () => {
    const source = await import("./index");
    const built: object = await import(builtEntry.href);

    expect(new Set(Object.keys(built))).toStrictEqual(
      new Set(Object.keys(source))
    );
  });
});
