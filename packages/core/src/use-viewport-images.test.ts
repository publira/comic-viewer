import { describe, expect, it } from "vitest";

import { getImageMimeType, getPageImageKey } from "./use-viewport-images";

describe(getImageMimeType, () => {
  it("preserves image MIME types when decoding fetched data", () => {
    expect(getImageMimeType("data:image/svg+xml;charset=UTF-8,<svg />")).toBe(
      "image/svg+xml"
    );
    expect(getImageMimeType("https://example.com/page.webp?token=abc")).toBe(
      "image/webp"
    );
    expect(getImageMimeType("/plugin-pages/page-1.jpg")).toBe("image/jpeg");
    expect(getImageMimeType("/plugin-pages/page-1.jpg.enc", "image/jpeg")).toBe(
      "image/jpeg"
    );
  });

  it("returns undefined for an unknown extension", () => {
    expect(getImageMimeType("/plugin-pages/page-1.bin")).toBeUndefined();
  });
});

describe(getPageImageKey, () => {
  it("keys a cached image by its index and source", () => {
    expect(
      getPageImageKey(2, { id: "p3", src: "page3.png", title: "Page 3" })
    ).toBe("2:page3.png");
  });
});
