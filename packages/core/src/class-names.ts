/** Combines a required PCV class with an optional consumer class name. */
export const composeClassName = (
  requiredClassName: string,
  className?: string
): string =>
  className === undefined
    ? requiredClassName
    : `${requiredClassName} ${className}`;
