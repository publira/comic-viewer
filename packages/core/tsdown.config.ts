import { defineConfig } from "tsdown";

export default defineConfig({
  // A server component then imports client references instead of failing
  // with a hooks error. Rolldown warns that a directive in src may be dropped.
  banner: { js: '"use client";' },
  clean: true,
  deps: {
    neverBundle: ["react"],
  },
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
});
