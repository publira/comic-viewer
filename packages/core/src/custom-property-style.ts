import type { CSSProperties } from "react";

/**
 * An inline style that also sets custom properties, which React passes on as
 * they are and `CSSProperties` has no type for.
 */
export type CustomPropertyStyle = CSSProperties &
  Partial<Record<`--${string}`, number | string>>;
