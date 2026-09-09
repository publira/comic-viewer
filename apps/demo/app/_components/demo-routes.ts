/** One demo page, as the navigation lists it. */
export interface DemoRoute {
  href: string;
  label: string;
}

/** A set of demo pages the navigation reveals through a single menu. */
export interface DemoRouteGroup {
  items: readonly DemoRoute[];
  label: string;
  /** The path segment every route of the group is nested under. */
  segment: string;
}

/** The entry point, which stands outside the grouped routes. */
export const basicRoute: DemoRoute = { href: "/", label: "Basic" };

/**
 * `features` are capabilities the library provides directly, `recipes` are
 * integration patterns an application builds on top of it, and `plugins` are
 * the pipeline demos.
 */
export const demoRouteGroups: readonly DemoRouteGroup[] = [
  {
    items: [
      { href: "/features/spreads", label: "Spreads" },
      { href: "/features/spread-page", label: "Spread page" },
      { href: "/features/slots", label: "Slots" },
      { href: "/features/ltr", label: "LTR" },
      { href: "/features/controls", label: "Controls" },
      { href: "/features/zoom", label: "Zoom" },
    ],
    label: "Features",
    segment: "/features",
  },
  {
    items: [
      { href: "/recipes/fullscreen", label: "Fullscreen" },
      { href: "/recipes/progress", label: "Progress" },
      { href: "/recipes/lazy", label: "Lazy" },
    ],
    label: "Recipes",
    segment: "/recipes",
  },
  {
    items: [
      { href: "/plugins/decrypted", label: "Decrypt" },
      { href: "/plugins/watermark", label: "Watermark" },
    ],
    label: "Plugins",
    segment: "/plugins",
  },
];

/** Whether the path on screen is one of the pages the group holds. */
export const isRouteGroupCurrent = (group: DemoRouteGroup, pathname: string) =>
  pathname === group.segment || pathname.startsWith(`${group.segment}/`);
