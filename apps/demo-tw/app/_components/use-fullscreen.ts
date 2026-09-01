"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { RefObject } from "react";

/**
 * The Fullscreen API as Safari exposed it before 16.4. Every current browser
 * implements the standard names, so the prefixed ones are only reached for when
 * their standard counterpart is missing.
 */
interface WebKitFullscreenDocument {
  webkitExitFullscreen?: () => void;
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
}

interface WebKitFullscreenElement {
  webkitRequestFullscreen?: () => void;
}

type FullscreenDocument = Document & WebKitFullscreenDocument;
type FullscreenElement = HTMLElement & WebKitFullscreenElement;

const getFullscreenDocument = (): FullscreenDocument => document;

const getFullscreenElement = (): Element | null => {
  const target = getFullscreenDocument();

  return target.fullscreenElement ?? target.webkitFullscreenElement ?? null;
};

const isFullscreenEnabled = (): boolean => {
  const target = getFullscreenDocument();

  return target.fullscreenEnabled || target.webkitFullscreenEnabled === true;
};

const requestFullscreen = async (element: FullscreenElement): Promise<void> => {
  if (typeof element.requestFullscreen === "function") {
    await element.requestFullscreen();
    return;
  }

  element.webkitRequestFullscreen?.();
};

const exitFullscreen = async (): Promise<void> => {
  const target = getFullscreenDocument();

  if (typeof target.exitFullscreen === "function") {
    await target.exitFullscreen();
    return;
  }

  target.webkitExitFullscreen?.();
};

/**
 * The document reports every change, including the ones the page did not ask
 * for, such as leaving fullscreen through Escape or the browser's own control.
 */
const subscribeToFullscreenChange = (onFullscreenChange: () => void) => {
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);

  return () => {
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
  };
};

/** Whether the API exists never changes, so there is nothing to listen to. */
const subscribeToNothing = () => () => {
  // The value is fixed for the lifetime of the document.
};

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
 */
export const useFullscreen = (
  targetRef: RefObject<HTMLElement | null>
): Fullscreen => {
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreenChange,
    () =>
      targetRef.current !== null &&
      getFullscreenElement() === targetRef.current,
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

    if (getFullscreenElement() === null) {
      await requestFullscreen(target);
      return;
    }

    await exitFullscreen();
  }, [targetRef]);

  return { isFullscreen, isSupported, toggleFullscreen };
};
