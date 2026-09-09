/**
 * A decoded page image, as the viewer holds it in its cache, hands it to an
 * `afterDecode` hook, and draws it onto a page canvas.
 */
export type DecodedPageImage = HTMLImageElement | ImageBitmap;

/** Releases every decoded image that owns an explicit browser resource. */
export const closeDecodedImages = (
  images: readonly DecodedPageImage[]
): void => {
  for (const image of images) {
    if ("close" in image) {
      image.close();
    }
  }
};
