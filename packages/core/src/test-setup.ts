import "@testing-library/jest-dom";

// JSDOM has no canvas implementation and logs a not-implemented error instead.
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: () => null,
  writable: true,
});
