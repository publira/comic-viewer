/**
 * Reads the pixel size of an encoded image from its header, so a page can be
 * decoded below that size without decoding it at full size first. Only the
 * formats a comic page is commonly served in are recognised.
 */

/** The size an image is drawn at, after its orientation metadata. */
export interface ImageSize {
  height: number;
  width: number;
}

const FOURTEEN_BITS = 0x40_00;

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  signature.every((byte, index) => bytes[index] === byte);

const readAscii = (view: DataView, offset: number, length: number): string =>
  offset + length > view.byteLength
    ? ""
    : String.fromCodePoint(
        ...new Uint8Array(view.buffer, view.byteOffset + offset, length)
      );

const toSize = (
  width: number,
  height: number,
  rotated = false
): ImageSize | undefined => {
  if (width <= 0 || height <= 0) {
    return undefined;
  }

  return rotated ? { height: width, width: height } : { height, width };
};

const readPngSize = (view: DataView): ImageSize | undefined =>
  readAscii(view, 12, 4) === "IHDR" && view.byteLength >= 24
    ? toSize(view.getUint32(16), view.getUint32(20))
    : undefined;

const readGifSize = (view: DataView): ImageSize | undefined =>
  view.byteLength >= 10
    ? toSize(view.getUint16(6, true), view.getUint16(8, true))
    : undefined;

const readWebpSize = (view: DataView): ImageSize | undefined => {
  const chunk = readAscii(view, 12, 4);
  if (chunk === "VP8 " && view.byteLength >= 30) {
    // The two bits above each 14-bit dimension hold its upscaling factor.
    return toSize(
      view.getUint16(26, true) % FOURTEEN_BITS,
      view.getUint16(28, true) % FOURTEEN_BITS
    );
  }
  if (chunk === "VP8L" && view.byteLength >= 25) {
    const bits = view.getUint32(21, true);
    return toSize(
      (bits % FOURTEEN_BITS) + 1,
      (Math.floor(bits / FOURTEEN_BITS) % FOURTEEN_BITS) + 1
    );
  }
  if (chunk === "VP8X" && view.byteLength >= 30) {
    const readUint24 = (offset: number): number =>
      view.getUint16(offset, true) + view.getUint8(offset + 2) * 0x1_00_00;
    return toSize(readUint24(24) + 1, readUint24(27) + 1);
  }
  return undefined;
};

/** Reads the EXIF orientation tag of a JPEG APP1 segment, if it has one. */
const readExifOrientation = (
  view: DataView,
  start: number,
  end: number
): number | undefined => {
  if (readAscii(view, start, 6) !== "Exif\0\0") {
    return undefined;
  }

  const tiff = start + 6;
  const littleEndian = readAscii(view, tiff, 2) === "II";
  const firstIfd = tiff + view.getUint32(tiff + 4, littleEndian);
  if (firstIfd + 2 > end) {
    return undefined;
  }

  const entryCount = view.getUint16(firstIfd, littleEndian);
  for (let entry = 0; entry < entryCount; entry += 1) {
    const offset = firstIfd + 2 + entry * 12;
    if (offset + 12 > end) {
      return undefined;
    }
    if (view.getUint16(offset, littleEndian) === 0x01_12) {
      return view.getUint16(offset + 8, littleEndian);
    }
  }

  return undefined;
};

const readJpegSize = (view: DataView): ImageSize | undefined => {
  let orientation: number | undefined;
  let offset = 2;

  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      return undefined;
    }

    const marker = view.getUint8(offset + 1);
    // Fill bytes and markers without a length carry no segment to skip.
    if (
      marker === 0xff ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd8)
    ) {
      offset += marker === 0xff ? 1 : 2;
      continue;
    }

    const length = view.getUint16(offset + 2);
    const segmentEnd = Math.min(offset + 2 + length, view.byteLength);
    if (marker === 0xe1 && orientation === undefined) {
      orientation = readExifOrientation(view, offset + 4, segmentEnd);
    }
    // Every SOF marker but DHT, JPG, and DAC holds the frame size.
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return offset + 9 <= view.byteLength
        ? toSize(
            view.getUint16(offset + 7),
            view.getUint16(offset + 5),
            orientation !== undefined && orientation >= 5 && orientation <= 8
          )
        : undefined;
    }

    offset += 2 + length;
  }

  return undefined;
};

/** Walks ISOBMFF boxes, descending into the containers the AVIF size sits in. */
const readAvifProperties = (
  view: DataView,
  start: number,
  end: number,
  properties: { rotated: boolean; sizes: ImageSize[] }
): void => {
  let offset = start;

  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    const type = readAscii(view, offset + 4, 4);
    let header = 8;
    if (size === 1 && offset + 16 <= end) {
      size = Number(view.getBigUint64(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) {
      return;
    }

    const body = offset + header;
    const boxEnd = offset + size;
    if (type === "meta") {
      // `meta` is a full box: a version and flags precede its children.
      readAvifProperties(view, body + 4, boxEnd, properties);
    } else if (type === "iprp" || type === "ipco") {
      readAvifProperties(view, body, boxEnd, properties);
    } else if (type === "ispe" && body + 12 <= boxEnd) {
      const ispe = toSize(view.getUint32(body + 4), view.getUint32(body + 8));
      if (ispe !== undefined) {
        properties.sizes.push(ispe);
      }
    } else if (type === "irot" && body < boxEnd) {
      // An odd number of quarter turns swaps the width and the height.
      properties.rotated ||= view.getUint8(body) % 2 === 1;
    }

    offset = boxEnd;
  }
};

const readAvifSize = (view: DataView): ImageSize | undefined => {
  const properties = { rotated: false, sizes: [] as ImageSize[] };
  readAvifProperties(view, 0, view.byteLength, properties);
  // Thumbnails and auxiliary images are no larger than the primary image.
  let largest: ImageSize | undefined;
  for (const size of properties.sizes) {
    if (
      largest === undefined ||
      size.width * size.height > largest.width * largest.height
    ) {
      largest = size;
    }
  }

  return largest === undefined
    ? undefined
    : toSize(largest.width, largest.height, properties.rotated);
};

/**
 * Returns the size an encoded image is drawn at, or `undefined` when its format
 * is not recognised or its header is cut short.
 */
export const readImageSize = (buffer: ArrayBuffer): ImageSize | undefined => {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 12));

  try {
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      return readPngSize(view);
    }
    if (startsWith(bytes, [0xff, 0xd8])) {
      return readJpegSize(view);
    }
    if (readAscii(view, 0, 4) === "GIF8") {
      return readGifSize(view);
    }
    if (readAscii(view, 0, 4) === "RIFF" && readAscii(view, 8, 4) === "WEBP") {
      return readWebpSize(view);
    }
    if (readAscii(view, 4, 4) === "ftyp") {
      return readAvifSize(view);
    }
  } catch {
    // A truncated header reads past the end of the buffer.
  }

  return undefined;
};
