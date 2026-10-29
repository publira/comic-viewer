import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import next from "ultracite/oxlint/next";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
import react from "ultracite/oxlint/react";
import vitest from "ultracite/oxlint/vitest";

const jsPlugins = selectJsPlugins(["github", "sonarjs", "react-doctor"]);

export default defineConfig({
  extends: [core, react, next, vitest, nextJsPlugins, antiSlop, jsPlugins],
  ignorePatterns: [...(core.ignorePatterns ?? []), "**/CHANGELOG.md"],
  jsPlugins: jsPlugins.jsPlugins,
  rules: {
    // Conflicts with unicorn/no-useless-undefined over an effect's `return;`.
    "sonarjs/no-inconsistent-returns": "off",
    // The README's public API is the `import * as ComicViewer` namespace.
    "sonarjs/no-wildcard-import": "off",
  },
  settings: jsPluginSettings,
});
