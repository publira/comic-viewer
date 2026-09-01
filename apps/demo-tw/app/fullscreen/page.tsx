import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { FullscreenReader } from "./_components/fullscreen-reader";

const sourceCode = `import { useCallback, useEffect, useRef, useState } from "react";

const useFullscreen = (targetRef) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, [targetRef]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement === null) {
      await targetRef.current?.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  }, [targetRef]);

  return { isFullscreen, toggleFullscreen };
};

export const FullscreenReader = ({ pages }) => {
  const containerRef = useRef(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  // The container is the element handed to the screen, so the control goes
  // inside it and stays reachable once the reader fills the display.
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl [&:fullscreen]:rounded-none"
      ref={containerRef}
    >
      <Reader pages={pages} />
      <button
        className="absolute end-3 top-3 z-20 rounded-full bg-black/60 px-3.5 py-1.5"
        onClick={() => void toggleFullscreen()}
        type="button"
      >
        {isFullscreen ? "Exit full screen" : "Enter full screen"}
      </button>
    </div>
  );
};`;

const FullscreenPage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[8/5] min-h-96 w-full"
      >
        <FullscreenReader pages={basicSamplePages} />
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Fullscreen reading</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          The viewer leaves the browser&apos;s Fullscreen API to the host
          application, because which element should fill the screen and what the
          control looks like are decisions only the surrounding page can make.
          This demo passes its own reader container to{" "}
          <code>requestFullscreen()</code> instead of the whole document, so the
          reader and its toggle are the only things left on screen, and the{" "}
          <code>[&amp;:fullscreen]</code> variant drops the rounding the box
          carries the rest of the time.
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          The button reads its label back from the <code>fullscreenchange</code>{" "}
          event rather than from the call it made, which keeps it in step when a
          reader leaves fullscreen through <kbd>Esc</kbd> or the browser&apos;s
          own control. Nothing has to be told about the new size: the viewer
          measures its container with a <code>ResizeObserver</code>, so the page
          fit and the switch between the single- and double-page layouts follow
          the container into fullscreen and back out on their own.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default FullscreenPage;
