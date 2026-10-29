"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import { useState } from "react";

import { getViewerStyle } from "#components/viewer-layout";

import styles from "../page.module.css";

const gestureOptions = [
  { label: "Edge click", name: "edgeClick" },
  { label: "Swipe", name: "swipe" },
  { label: "Double tap", name: "doubleTap" },
  { label: "Arrow keys", name: "keyboard" },
] as const;

type GestureName = (typeof gestureOptions)[number]["name"];

interface GesturesComicViewerProps {
  pages: readonly ViewerPage[];
}

/** Renders a reader whose gestures a panel below it turns on and off. */
export const GesturesComicViewer = ({ pages }: GesturesComicViewerProps) => {
  const [enabled, setEnabled] = useState<Record<GestureName, boolean>>({
    doubleTap: true,
    edgeClick: true,
    keyboard: true,
    swipe: true,
  });

  const [isKeyboardGlobal, setIsKeyboardGlobal] = useState(false);

  return (
    <>
      <div className={styles.viewer} style={getViewerStyle(pages)}>
        <ComicViewer.Root className={styles.viewerContent} pages={pages}>
          <ComicViewer.Viewport
            gestures={{
              doubleTap: { enabled: enabled.doubleTap },
              edgeClick: { enabled: enabled.edgeClick },
              keyboard: {
                enabled: enabled.keyboard,
                scope: isKeyboardGlobal ? "global" : "viewport",
              },
              swipe: { enabled: enabled.swipe },
            }}
          />
          <ComicViewer.Toolbar />
          <ComicViewer.PageNavigation />
        </ComicViewer.Root>
      </div>
      <fieldset className={styles.gestures}>
        <legend className={styles.gesturesLegend}>Gestures</legend>
        <div className={styles.gestureOptions}>
          {gestureOptions.map((option) => (
            <label className={styles.gestureOption} key={option.name}>
              <input
                checked={enabled[option.name]}
                onChange={(event) => {
                  const { checked } = event.target;
                  setEnabled((current) => ({
                    ...current,
                    [option.name]: checked,
                  }));
                }}
                type="checkbox"
              />
              {option.label}
            </label>
          ))}
          <label className={styles.gestureOption}>
            <input
              checked={isKeyboardGlobal}
              disabled={!enabled.keyboard}
              onChange={(event) => {
                setIsKeyboardGlobal(event.target.checked);
              }}
              type="checkbox"
            />
            Arrow keys from anywhere on the page
          </label>
        </div>
      </fieldset>
    </>
  );
};
