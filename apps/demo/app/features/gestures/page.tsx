import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { GesturesComicViewer } from "./_components/gestures-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";
import { useState } from "react";

const gestureNames = ["edgeClick", "swipe", "doubleTap", "keyboard"];

export const Reader = ({ pages }) => {
  const [enabled, setEnabled] = useState({
    doubleTap: true,
    edgeClick: true,
    keyboard: true,
    swipe: true,
  });
  const [isKeyboardGlobal, setIsKeyboardGlobal] = useState(false);

  return (
    <>
      <ComicViewer.Root pages={pages}>
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
      <fieldset>
        <legend>Gestures</legend>
        {gestureNames.map((name) => (
          <label key={name}>
            <input
              checked={enabled[name]}
              onChange={(event) =>
                setEnabled({ ...enabled, [name]: event.target.checked })
              }
              type="checkbox"
            />
            {name}
          </label>
        ))}
        <label>
          <input
            checked={isKeyboardGlobal}
            onChange={(event) => setIsKeyboardGlobal(event.target.checked)}
            type="checkbox"
          />
          Arrow keys from anywhere on the page
        </label>
      </fieldset>
    </>
  );
};`;

const GesturesPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <GesturesComicViewer pages={basicSamplePages} />
      <section className={styles.description}>
        <h2>Turn viewport gestures on and off</h2>
        <p>
          Clear a box and try the gesture again. Without the edge click, a click
          anywhere on the page reveals the controls instead of turning it;
          without the swipe, a drag leaves the page where it is; without the
          double tap, a page no longer snaps to fit-to-width. Every gesture is
          one group of the <code>gestures</code> option on <code>Viewport</code>
          , so a setting added later joins its group rather than becoming
          another prop.
        </p>
        <p>
          The arrow keys answer only while the reader is focused. Click the page
          or tab to it first; a key pressed anywhere else on this page leaves
          the reader alone, so two readers on one page never turn together.
          &ldquo;Arrow keys from anywhere on the page&rdquo; sets{" "}
          <code>keyboard.scope</code> to <code>&quot;global&quot;</code>, which
          listens on the whole window instead. <kbd>Enter</kbd> and{" "}
          <kbd>Space</kbd> keep revealing the controls even with the arrow keys
          off.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default GesturesPage;
