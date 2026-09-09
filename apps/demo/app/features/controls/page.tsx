import { basicSamplePages } from "../../_components/sample-pages";
import { SourceCodePanel } from "../../_components/source-code-panel";
import { ControlsComicViewer } from "./_components/controls-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages}>
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar>
      <ComicViewer.ViewModeToggle />
      <ComicViewer.ReadingDirectionToggle />
      <ComicViewer.PageProgress>
        <ComicViewer.PageProgressSlider />
        <ComicViewer.PageStatus />
      </ComicViewer.PageProgress>
      <div role="group" aria-label="Page fit">
        <ComicViewer.PageFitModeToggle mode="height" />
        <ComicViewer.PageFitModeToggle mode="width" />
        <ComicViewer.PageFitModeToggle mode="actual" />
      </div>
    </ComicViewer.Toolbar>
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const ControlsPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <ControlsComicViewer pages={basicSamplePages} />
      <section className={styles.description}>
        <h2>Reader setting toggles</h2>
        <p>
          Tap the page to reveal the toolbar. <code>ViewModeToggle</code>,{" "}
          <code>ReadingDirectionToggle</code>, and{" "}
          <code>PageFitModeToggle</code> drive the settings the viewer context
          exposes, so a toolbar does not have to wire the setters itself. None
          of them is part of the default toolbar, which keeps showing the
          reading progress alone: each is an independent named export that
          reaches the tree only where it is placed.
        </p>
        <p>
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
