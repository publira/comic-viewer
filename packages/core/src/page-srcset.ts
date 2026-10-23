/**
 * The HTML `srcset` microsyntax a page may carry beside `src`, parsed with the
 * specification's "parse a srcset attribute" algorithm so that a URL holding a
 * comma, a stray comma, and a malformed candidate behave as they do in a
 * browser, and a candidate selected the way a browser selects one.
 */

/** A rendition described by its intrinsic width in pixels, a `w` candidate. */
export interface SrcsetWidthCandidate {
  url: string;
  width: number;
}

/** A rendition described by its pixel density, an `x` candidate. */
export interface SrcsetDensityCandidate {
  density: number;
  url: string;
}

/**
 * A parsed `srcset`. Every candidate shares one kind of descriptor, because a
 * list that mixes the two is invalid.
 */
export type ParsedSrcset =
  | { candidates: readonly SrcsetDensityCandidate[]; kind: "density" }
  | { candidates: readonly SrcsetWidthCandidate[]; kind: "width" };

/** The size a page is about to be drawn at, which a candidate is picked for. */
export interface SrcsetRequirement {
  /** The pixel density to serve, usually `devicePixelRatio`. */
  density: number;
  /** The width to serve, in device pixels. */
  width: number;
}

interface RawCandidate {
  descriptors: readonly string[];
  url: string;
}

interface DescribedCandidate {
  density?: number;
  url: string;
  width?: number;
}

const ASCII_WHITESPACE = new Set(["\t", "\n", "\f", "\r", " "]);
const NON_NEGATIVE_INTEGER = /^\d+$/u;
const FLOATING_POINT_NUMBER = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/iu;

/**
 * Reads the descriptors that follow a URL, up to the comma or the end of the
 * input that closes the candidate, and returns the position after them. A
 * comma inside parentheses belongs to the descriptor, as the specification
 * reserves for future syntax.
 */
const readDescriptors = (
  input: string,
  start: number
): { descriptors: readonly string[]; position: number } => {
  const descriptors: string[] = [];
  let current = "";
  let inParens = false;
  let position = start;

  const endDescriptor = (): void => {
    if (current !== "") {
      descriptors.push(current);
      current = "";
    }
  };

  while (position < input.length) {
    const character = input[position];
    position += 1;

    if (inParens) {
      current += character;
      inParens = character !== ")";
    } else if (character === ",") {
      endDescriptor();
      return { descriptors, position };
    } else if (ASCII_WHITESPACE.has(character)) {
      endDescriptor();
    } else {
      current += character;
      inParens = character === "(";
    }
  }

  endDescriptor();
  return { descriptors, position };
};

/** Splits a `srcset` into its candidates, each a URL and its raw descriptors. */
const splitCandidates = (input: string): RawCandidate[] => {
  const candidates: RawCandidate[] = [];
  let position = 0;

  while (position < input.length) {
    if (ASCII_WHITESPACE.has(input[position]) || input[position] === ",") {
      position += 1;
      continue;
    }

    const urlStart = position;
    while (position < input.length && !ASCII_WHITESPACE.has(input[position])) {
      position += 1;
    }
    const url = input.slice(urlStart, position);

    // A URL that ends with commas has no descriptors; the commas close it.
    if (url.endsWith(",")) {
      candidates.push({ descriptors: [], url: url.replace(/,+$/u, "") });
      continue;
    }

    const { descriptors, position: next } = readDescriptors(input, position);
    candidates.push({ descriptors, url });
    position = next;
  }

  return candidates;
};

/**
 * Interprets the descriptors of a candidate, and drops the candidate when any
 * of them is malformed or repeats a dimension. An `h` descriptor is reserved by
 * the specification; it is accepted beside a `w` one and otherwise ignored.
 */
const describeCandidate = ({
  descriptors,
  url,
}: RawCandidate): DescribedCandidate | undefined => {
  let density: number | undefined;
  let height: number | undefined;
  let width: number | undefined;

  for (const descriptor of descriptors) {
    const unit = descriptor.at(-1);
    const value = descriptor.slice(0, -1);

    if (unit === "w" && NON_NEGATIVE_INTEGER.test(value)) {
      if (width !== undefined || density !== undefined) {
        return undefined;
      }
      width = Number(value);
      if (width === 0) {
        return undefined;
      }
    } else if (unit === "x" && FLOATING_POINT_NUMBER.test(value)) {
      if (
        width !== undefined ||
        density !== undefined ||
        height !== undefined
      ) {
        return undefined;
      }
      density = Number(value);
      if (density < 0) {
        return undefined;
      }
    } else if (unit === "h" && NON_NEGATIVE_INTEGER.test(value)) {
      if (density !== undefined || height !== undefined) {
        return undefined;
      }
      height = Number(value);
      if (height === 0) {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  if (height !== undefined && width === undefined) {
    return undefined;
  }

  return { density, url, width };
};

const hasWidth = (
  candidate: DescribedCandidate
): candidate is DescribedCandidate & { width: number } =>
  candidate.width !== undefined;

/**
 * Parses a `srcset`. Returns `undefined` when no candidate survives, or when
 * the list mixes `w` and `x` descriptors. A candidate without a descriptor
 * counts as `1x`, as it does for `<img>`.
 */
export const parseSrcset = (srcset: string): ParsedSrcset | undefined => {
  const candidates = splitCandidates(srcset).flatMap((candidate) => {
    const described = describeCandidate(candidate);
    return described === undefined ? [] : [described];
  });

  if (candidates.length === 0) {
    return undefined;
  }

  if (candidates.every(hasWidth)) {
    return {
      candidates: candidates.map(({ url, width }) => ({ url, width })),
      kind: "width",
    };
  }

  if (candidates.some(hasWidth)) {
    return undefined;
  }

  return {
    candidates: candidates.map(({ density = 1, url }) => ({ density, url })),
    kind: "density",
  };
};

/**
 * Picks the candidate with the smallest measure at or above the required one,
 * or the largest candidate when none reaches it. The first of equal candidates
 * wins, as in a browser.
 */
const pickCandidate = <TCandidate extends { url: string }>(
  candidates: readonly TCandidate[],
  required: number,
  measure: (candidate: TCandidate) => number
): string | undefined => {
  let chosen: TCandidate | undefined;

  for (const candidate of candidates) {
    if (chosen === undefined) {
      chosen = candidate;
      continue;
    }

    const value = measure(candidate);
    const chosenValue = measure(chosen);
    const improves =
      chosenValue >= required
        ? value >= required && value < chosenValue
        : value > chosenValue;

    if (improves) {
      chosen = candidate;
    }
  }

  return chosen?.url;
};

/**
 * Selects the URL to fetch for a page drawn at `requirement`, or `undefined`
 * when `srcset` yields no candidate and the caller should fall back to `src`.
 * A `w` list is matched against the required width and an `x` list against
 * the required density.
 */
export const selectSrcsetCandidate = (
  srcset: string | undefined,
  requirement: SrcsetRequirement
): string | undefined => {
  const parsed = srcset === undefined ? undefined : parseSrcset(srcset);
  if (parsed === undefined) {
    return undefined;
  }

  return parsed.kind === "width"
    ? pickCandidate(
        parsed.candidates,
        requirement.width,
        (candidate) => candidate.width
      )
    : pickCandidate(
        parsed.candidates,
        requirement.density,
        (candidate) => candidate.density
      );
};
