"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import { readerClassNames } from "../../_components/reader-class-names";
import { TailwindReader } from "../../_components/tailwind-reader";

interface ControlsReaderProps {
  pages: readonly ViewerPage[];
}

/**
 * Renders the shared reader with a toolbar of its own, composed as a child so
 * that the extra controls replace the default progress bar in place.
 */
export const ControlsReader = ({ pages }: ControlsReaderProps) => (
  <TailwindReader pages={pages}>
    <ComicViewer.Toolbar className={readerClassNames.toolbar}>
      <ComicViewer.ViewModeToggle className={readerClassNames.settingToggle} />
      <ComicViewer.ReadingDirectionToggle
        className={readerClassNames.settingToggle}
      />
      <ComicViewer.PageProgress className={readerClassNames.pageProgress}>
        <ComicViewer.PageProgressSlider
          className={readerClassNames.pageProgressSlider}
        />
        <ComicViewer.PageStatus className={readerClassNames.pageStatus} />
      </ComicViewer.PageProgress>
      <div
        aria-label="Page fit"
        className={readerClassNames.pageFitModeGroup}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A row of toggle buttons is a group of controls, not the form fieldset the semantic tags stand for.
        role="group"
      >
        <ComicViewer.PageFitModeToggle
          className={readerClassNames.settingToggle}
          mode="height"
        />
        <ComicViewer.PageFitModeToggle
          className={readerClassNames.settingToggle}
          mode="width"
        />
        <ComicViewer.PageFitModeToggle
          className={readerClassNames.settingToggle}
          mode="actual"
        />
      </div>
    </ComicViewer.Toolbar>
  </TailwindReader>
);
