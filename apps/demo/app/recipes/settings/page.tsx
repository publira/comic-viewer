import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { SettingsComicViewer } from "./_components/settings-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";
import { useState } from "react";

const readingDirectionOptions = [
  { label: "Right to left", value: "rtl" },
  { label: "Left to right", value: "ltr" },
];

const viewModeOptions = [
  { label: "Single page", value: "single" },
  { label: "Double page", value: "double" },
];

const pageFitModeOptions = [
  { label: "Height", value: "height" },
  { label: "Width", value: "width" },
  { label: "Actual size", value: "actual" },
];

const SettingOptions = ({ legend, name, onChange, options, value }) => (
  <fieldset>
    <legend>{legend}</legend>
    {options.map((option) => (
      <label key={option.value}>
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
  </fieldset>
);

export const Reader = ({ pages }) => {
  const [readingDirection, setReadingDirection] = useState("rtl");
  const [viewMode, setViewMode] = useState("double");
  const [pageFitMode, setPageFitMode] = useState("height");

  return (
    <>
      <ComicViewer.Root
        onPageFitModeChange={setPageFitMode}
        onReadingDirectionChange={setReadingDirection}
        onViewModeChange={setViewMode}
        pageFitMode={pageFitMode}
        pages={pages}
        readingDirection={readingDirection}
        viewMode={viewMode}
      >
        <ComicViewer.Viewport />
        <ComicViewer.Toolbar>
          <ComicViewer.ViewModeToggle />
          <ComicViewer.ReadingDirectionToggle />
          <ComicViewer.PageFitModeToggle />
        </ComicViewer.Toolbar>
        <ComicViewer.PageNavigation />
      </ComicViewer.Root>
      <form aria-label="Reader settings">
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
};`;

const SettingsPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <SettingsComicViewer pages={basicSamplePages} />
      <section className={styles.description}>
        <h2>Hold the reader settings in the application</h2>
        <p>
          The panel under the reader and the toggles in its toolbar change the
          same three settings. The application holds them and hands them to the
          viewer as <code>readingDirection</code>, <code>viewMode</code>, and{" "}
          <code>pageFitMode</code>. <code>onReadingDirectionChange</code>,{" "}
          <code>onViewModeChange</code>, and <code>onPageFitModeChange</code>{" "}
          report every change a toolbar toggle or a double tap asks for, so a
          change made on either side shows up on the other. Writing these values
          to storage the way the Progress recipe stores the page index would
          remember a reader&rsquo;s preferences across documents.
        </p>
        <p>
          A controlled view mode is not switched for the viewport width. Pick
          &ldquo;Double page&rdquo; and narrow the window: the reader falls back
          to single pages while a spread does not fit, and the toolbar toggle
          disables itself. The panel keeps &ldquo;Double page&rdquo; selected,
          because the fallback is not reported as a change, and the spread comes
          back once the window is wide enough again.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SettingsPage;
