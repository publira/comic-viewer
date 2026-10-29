"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type {
  PageFitMode,
  ReadingDirection,
  ViewerPage,
  ViewMode,
} from "@publira/comic-viewer";
import { useState } from "react";

import { getViewerStyle } from "#components/viewer-layout";

import styles from "../page.module.css";

interface SettingOption<TValue extends string> {
  label: string;
  value: TValue;
}

const readingDirectionOptions: readonly SettingOption<ReadingDirection>[] = [
  { label: "Right to left", value: "rtl" },
  { label: "Left to right", value: "ltr" },
];

const viewModeOptions: readonly SettingOption<ViewMode>[] = [
  { label: "Single page", value: "single" },
  { label: "Double page", value: "double" },
];

const pageFitModeOptions: readonly SettingOption<PageFitMode>[] = [
  { label: "Height", value: "height" },
  { label: "Width", value: "width" },
  { label: "Actual size", value: "actual" },
];

interface SettingOptionsProps<TValue extends string> {
  legend: string;
  name: string;
  onChange: (value: TValue) => void;
  options: readonly SettingOption<TValue>[];
  value: TValue;
}

/** One setting of the panel, as a group of radio buttons. */
const SettingOptions = <TValue extends string>({
  legend,
  name,
  onChange,
  options,
  value,
}: SettingOptionsProps<TValue>) => (
  <fieldset className={styles.setting}>
    <legend className={styles.settingLegend}>{legend}</legend>
    <div className={styles.settingOptions}>
      {options.map((option) => (
        <label className={styles.settingOption} key={option.value}>
          <input
            checked={option.value === value}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          {option.label}
        </label>
      ))}
    </div>
  </fieldset>
);

interface SettingsComicViewerProps {
  pages: readonly ViewerPage[];
}

/**
 * Renders a reader whose settings the application holds, so that a panel
 * outside the viewer and the toggles in its toolbar stay on the same values.
 */
export const SettingsComicViewer = ({ pages }: SettingsComicViewerProps) => {
  const [readingDirection, setReadingDirection] =
    useState<ReadingDirection>("rtl");

  const [viewMode, setViewMode] = useState<ViewMode>("double");
  const [pageFitMode, setPageFitMode] = useState<PageFitMode>("height");

  return (
    <>
      <div className={styles.viewer} style={getViewerStyle(pages)}>
        <ComicViewer.Root
          className={styles.viewerContent}
          onPageFitModeChange={setPageFitMode}
          onReadingDirectionChange={setReadingDirection}
          onViewModeChange={setViewMode}
          pageFitMode={pageFitMode}
          pages={pages}
          readingDirection={readingDirection}
          viewMode={viewMode}
        >
          <ComicViewer.Viewport />
          <ComicViewer.Toolbar className={styles.toolbar}>
            <ComicViewer.ViewModeToggle />
            <ComicViewer.ReadingDirectionToggle />
            <ComicViewer.PageFitModeToggle />
          </ComicViewer.Toolbar>
          <ComicViewer.PageNavigation />
        </ComicViewer.Root>
      </div>
      <form aria-label="Reader settings" className={styles.settings}>
        <SettingOptions
          legend="Reading direction"
          name="reading-direction"
          onChange={setReadingDirection}
          options={readingDirectionOptions}
          value={readingDirection}
        />
        <SettingOptions
          legend="View mode"
          name="view-mode"
          onChange={setViewMode}
          options={viewModeOptions}
          value={viewMode}
        />
        <SettingOptions
          legend="Page fit"
          name="page-fit-mode"
          onChange={setPageFitMode}
          options={pageFitModeOptions}
          value={pageFitMode}
        />
      </form>
    </>
  );
};
