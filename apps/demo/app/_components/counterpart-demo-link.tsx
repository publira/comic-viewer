"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

/** Where the Tailwind CSS demo is published. */
const DEPLOYED_ORIGIN = "https://demo-tw.comic-viewer.publira.dev";
/** The port the Tailwind CSS demo is served on outside a deployment. */
const LOCAL_PORT = "4000";

/**
 * Points at the Tailwind CSS demo running beside this one, so that a locally
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

/** Links to the current page as the Tailwind CSS demo styles it. */
export const CounterpartDemoLink = () => {
  const pathname = usePathname();
  const origin = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return (
    <a
      className="demo-counterpart-link"
      href={`${origin}${pathname}`}
      title="Open this page in the Tailwind CSS demo"
    >
      Tailwind CSS demo
      <span aria-hidden="true">↗</span>
    </a>
  );
};
