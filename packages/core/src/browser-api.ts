/**
 * Whether the environment provides a browser API the viewer can run without,
 * such as `requestAnimationFrame` outside a browser.
 */
export const isAvailable = <TFunction extends (...args: never[]) => void>(
  api: TFunction | undefined
): api is TFunction => typeof api === "function";
