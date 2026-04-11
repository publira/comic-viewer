import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: ["react"],
  },
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
});
