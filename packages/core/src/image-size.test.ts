import { describe, expect, it } from "vitest";

import { readImageSize } from "./image-size";

const ascii = (text: string): number[] =>
  [...text].map((character) => character.codePointAt(0) ?? 0);

const uint16 = (value: number, littleEndian = false): number[] => {
  const view = new DataView(new ArrayBuffer(2));
  view.setUint16(0, value, littleEndian);
  return [...new Uint8Array(view.buffer)];
};

const uint32 = (value: number, littleEndian = false): number[] => {
  const view = new DataView(new ArrayBuffer(4));
  view.setUint32(0, value, littleEndian);
  return [...new Uint8Array(view.buffer)];
};

const toBuffer = (bytes: readonly number[]): ArrayBuffer =>
  new Uint8Array(bytes).buffer;

const png = (width: number, height: number): ArrayBuffer =>
  toBuffer([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...uint32(13),
    ...ascii("IHDR"),
    ...uint32(width),
    ...uint32(height),
    8,
    6,
    0,
    0,
    0,
  ]);

/** A JPEG with an optional EXIF orientation, an unrelated segment, and a SOF0. */
const jpeg = (
  width: number,
  height: number,
  orientation?: number
): ArrayBuffer => {
  const exif =
    orientation === undefined
      ? []
      : [
          ...ascii("Exif\0\0"),
          ...ascii("II"),
          ...uint16(42, true),
          ...uint32(8, true),
          ...uint16(1, true),
          ...uint16(0x01_12, true),
          ...uint16(3, true),
          ...uint32(1, true),
          ...uint16(orientation, true),
          0,
          0,
          ...uint32(0, true),
        ];

  return toBuffer([
    0xff,
    0xd8,
    ...(exif.length === 0
      ? []
      : [0xff, 0xe1, ...uint16(exif.length + 2), ...exif]),
    0xff,
    0xdb,
    ...uint16(4),
    0,
    0,
    0xff,
    0xc0,
    ...uint16(17),
    8,
    ...uint16(height),
    ...uint16(width),
    3,
  ]);
};

const box = (type: string, body: readonly number[]): number[] => [
  ...uint32(body.length + 8),
  ...ascii(type),
  ...body,
];

const ispe = (width: number, height: number): number[] =>
  box("ispe", [0, 0, 0, 0, ...uint32(width), ...uint32(height)]);

const avif = (properties: readonly number[]): ArrayBuffer =>
  toBuffer([
    ...box("ftyp", [...ascii("avif"), 0, 0, 0, 0, ...ascii("mif1")]),
    ...box("meta", [
      0,
      0,
      0,
      0,
      ...box("hdlr", [0, 0, 0, 0]),
      ...box("iprp", box("ipco", properties)),
    ]),
  ]);

describe(readImageSize, () => {
  it("reads the size of a PNG", () => {
    expect(readImageSize(png(1600, 2400))).toStrictEqual({
      height: 2400,
      width: 1600,
    });
  });

  it("reads the size of a GIF", () => {
    expect(
      readImageSize(
        toBuffer([
          ...ascii("GIF89a"),
          ...uint16(640, true),
          ...uint16(480, true),
        ])
      )
    ).toStrictEqual({ height: 480, width: 640 });
  });

  it("reads the frame size of a JPEG past the segments before it", () => {
    expect(readImageSize(jpeg(4000, 6000))).toStrictEqual({
      height: 6000,
      width: 4000,
    });
  });

  it("swaps the size of a JPEG whose orientation turns it a quarter", () => {
    expect(readImageSize(jpeg(6000, 4000, 6))).toStrictEqual({
      height: 6000,
      width: 4000,
    });
    expect(readImageSize(jpeg(6000, 4000, 3))).toStrictEqual({
      height: 4000,
      width: 6000,
    });
  });

  it("reads the size of each kind of WebP", () => {
    const riff = (chunk: string, body: readonly number[]): ArrayBuffer =>
      toBuffer([
        ...ascii("RIFF"),
        ...uint32(body.length + 12, true),
        ...ascii("WEBP"),
        ...ascii(chunk),
        ...uint32(body.length, true),
        ...body,
      ]);

    expect(
      readImageSize(
        riff("VP8 ", [
          0,
          0,
          0,
          0x9d,
          0x01,
          0x2a,
          ...uint16(1200, true),
          ...uint16(1800, true),
        ])
      )
    ).toStrictEqual({ height: 1800, width: 1200 });
    // Fourteen bits each for the width and the height, both less one.
    const lossless = 1199 + 1799 * 0x40_00;
    expect(
      readImageSize(riff("VP8L", [0x2f, ...uint32(lossless, true)]))
    ).toStrictEqual({ height: 1800, width: 1200 });
    expect(
      readImageSize(
        riff("VP8X", [
          0,
          0,
          0,
          0,
          ...uint32(1199, true).slice(0, 3),
          ...uint32(1799, true).slice(0, 3),
        ])
      )
    ).toStrictEqual({ height: 1800, width: 1200 });
  });

  it("reads the largest image size of an AVIF and its rotation", () => {
    expect(
      readImageSize(avif([...ispe(320, 480), ...ispe(1600, 2400)]))
    ).toStrictEqual({
      height: 2400,
      width: 1600,
    });
    expect(
      readImageSize(avif([...ispe(2400, 1600), ...box("irot", [1])]))
    ).toStrictEqual({ height: 2400, width: 1600 });
  });

  it("returns undefined for an unknown format or a header cut short", () => {
    expect(readImageSize(toBuffer(ascii("<svg></svg>")))).toBeUndefined();
    expect(readImageSize(new ArrayBuffer(1))).toBeUndefined();
    expect(readImageSize(png(1600, 2400).slice(0, 18))).toBeUndefined();
    expect(readImageSize(jpeg(4000, 6000).slice(0, 12))).toBeUndefined();
  });
});
