import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import "@testing-library/jest-dom";

// Vitest 5 dropped the global `jest.Matchers` bridge that
// @testing-library/jest-dom augments, so register its matchers explicitly.
// oxlint-disable typescript/no-empty-interface, typescript/no-empty-object-type -- Declaration merging is the only way to extend the Vitest matcher interface.
declare module "vitest" {
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    T = unknown,
  > extends TestingLibraryMatchers<unknown, R> {}
}
// oxlint-enable typescript/no-empty-interface, typescript/no-empty-object-type

// JSDOM has no canvas implementation and logs a not-implemented error instead.
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: () => null,
  writable: true,
});
