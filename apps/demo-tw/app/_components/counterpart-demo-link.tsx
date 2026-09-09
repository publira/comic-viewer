"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

/** Where the demo styled with the bundled stylesheet is published. */
const DEPLOYED_ORIGIN = "https://demo.comic-viewer.publira.dev";
/** The port that demo is served on outside a deployment. */
const LOCAL_PORT = "3000";

/**
 * Points at the standard demo running beside this one, so that a locally
 * served demo links to the local counterpart rather than the deployed site.
 */
const resolveCounterpartOrigin = ({ hostname, port, protocol }: Location) => {
  if (port === "") {
    return DEPLOYED_ORIGIN;
  }

  const origin = new URL(DEPLOYED_ORIGIN);

  origin.protocol = protocol;
  origin.hostname = hostname;
  origin.port = LOCAL_PORT;

  return origin.origin;
};

/** The origin never changes while the page is open, so nothing is watched. */
const subscribe = () => () => {
  // Nothing to unsubscribe from.
};

const getServerSnapshot = () => DEPLOYED_ORIGIN;

const getSnapshot = () => resolveCounterpartOrigin(window.location);

/** Links to the current page as the bundled stylesheet styles it. */
export const CounterpartDemoLink = () => {
  const pathname = usePathname();
  const origin = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return (
    <a
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-sky-500 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:border-sky-400 dark:hover:bg-slate-800 dark:hover:text-white"
      href={`${origin}${pathname}`}
      title="Open this page in the demo styled with the bundled stylesheet"
    >
      Default stylesheet demo
      <span aria-hidden="true">↗</span>
    </a>
  );
};
