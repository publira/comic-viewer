"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { RefObject } from "react";

/**
 * The document reports every change, including the ones the page did not ask
 * for, such as leaving fullscreen through Escape or the browser's own control.
 */
const subscribeToFullscreenChange = (onFullscreenChange: () => void) => {
  document.addEventListener("fullscreenchange", onFullscreenChange);

  return () => {
    document.removeEventListener("fullscreenchange", onFullscreenChange);
  };
};

/** Whether the API exists never changes, so there is nothing to listen to. */
const subscribeToNothing = () => () => {
  // The value is fixed for the lifetime of the document.
};

const isFullscreenEnabled = () => document.fullscreenEnabled;

/** Rendering happens on the server, where there is no Fullscreen API to ask. */
const getServerSnapshot = () => false;

interface Fullscreen {
  /** Whether the element behind the ref is the one currently filling the screen. */
  isFullscreen: boolean;
  /** Whether this document is allowed to enter fullscreen at all. */
  isSupported: boolean;
  /** Enters fullscreen, or leaves it when an element already fills the screen. */
  toggleFullscreen: () => Promise<void>;
}

/**
 * Drives the native Fullscreen API for a single element. A browser only grants
 * a request that comes out of a user gesture, so call `toggleFullscreen`
 * straight from an event handler.
 *
 * The state is read back from the document rather than from the return of the
 * request, which keeps a control in step with what is on screen however
 * fullscreen was left.
 *
 * Only the standard names are used. The prefixed WebKit ones would matter for
 * Safari before 16.4, which is older than the CSS these demos are already
 * written in, such as `light-dark()`, so a fallback could never be reached.
 */
export const useFullscreen = (
  targetRef: RefObject<HTMLElement | null>
): Fullscreen => {
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreenChange,
    () =>
      targetRef.current !== null &&
      document.fullscreenElement === targetRef.current,
    getServerSnapshot
  );
  // Until the browser has hydrated the markup there is no API to ask, so a
  // control renders unavailable and turns usable where fullscreen is offered.
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    isFullscreenEnabled,
    getServerSnapshot
  );

  const toggleFullscreen = useCallback(async () => {
    const target = targetRef.current;

    if (target === null) {
      return;
    }

    if (document.fullscreenElement === null) {
      await target.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  }, [targetRef]);

  return { isFullscreen, isSupported, toggleFullscreen };
};
