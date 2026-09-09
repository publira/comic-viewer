import { readerClassNames } from "#components/reader-class-names";
import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { ControlsReader } from "./_components/controls-reader";

// "./reader" is the styled reader the front page shows in full. A Toolbar
// written among its children takes the place of the one it renders by default,
// so the only thing left for this snippet is the toolbar itself.
const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

import { Reader } from "./reader";

export const ControlsReader = ({ pages }) => (
  <Reader pages={pages}>
    <ComicViewer.Toolbar className="${readerClassNames.toolbar}">
      <ComicViewer.ViewModeToggle className="${readerClassNames.settingToggle}" />
      <ComicViewer.ReadingDirectionToggle className="${readerClassNames.settingToggle}" />
      <ComicViewer.PageProgress className="${readerClassNames.pageProgress}">
        <ComicViewer.PageProgressSlider className="${readerClassNames.pageProgressSlider}" />
        <ComicViewer.PageStatus className="${readerClassNames.pageStatus}" />
      </ComicViewer.PageProgress>
      <div role="group" aria-label="Page fit" className="${readerClassNames.pageFitModeGroup}">
        <ComicViewer.PageFitModeToggle mode="height" className="${readerClassNames.settingToggle}" />
        <ComicViewer.PageFitModeToggle mode="width" className="${readerClassNames.settingToggle}" />
        <ComicViewer.PageFitModeToggle mode="actual" className="${readerClassNames.settingToggle}" />
      </div>
    </ComicViewer.Toolbar>
  </Reader>
);`;

const ControlsPage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
      >
        <ControlsReader pages={basicSamplePages} />
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Reader setting toggles</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Tap the page to reveal the toolbar. <code>ViewModeToggle</code>,{" "}
          <code>ReadingDirectionToggle</code>, and{" "}
          <code>PageFitModeToggle</code> drive the settings the viewer context
          exposes, so a toolbar does not have to wire the setters itself. None
          of them is part of the default toolbar: each is an independent named
          export that reaches the tree only where it is placed, and each renders
          a plain button with a text label that Tailwind utilities dress here.
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          The view-mode toggle reports the mode through{" "}
          <code>aria-pressed</code> and disables itself on a viewport too narrow
          for a spread. The page-fit buttons each name one mode, so they compose
          into the group around them; a single one given no <code>mode</code>{" "}
          would cycle through the three instead.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default ControlsPage;
