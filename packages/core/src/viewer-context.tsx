import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PropsWithChildren } from "react";

import type { ViewerPlugin } from "./plugin";

export type ViewMode = "single" | "double";
export type ReadingDirection = "rtl" | "ltr";
/** Controls how a page is sized inside the viewport. */
export type PageFitMode = "width" | "height" | "actual";

export interface ViewerPage {
  height?: number;
  id: string;
  mimeType?: string;
  placeholder?: string;
  title: string;
  src: string;
  width?: number;
}

export interface ViewerContextValue<TPage extends ViewerPage = ViewerPage> {
  pages: readonly TPage[];
  plugins: readonly ViewerPlugin[];
  currentIndex: number;
  viewMode: ViewMode;
  pageFitMode: PageFitMode;
  readingDirection: ReadingDirection;
  spreadStartIndex: number;
  /** Whether the reader controls, such as Toolbar and PageNavigation, show. */
  areControlsVisible: boolean;
  /**
   * Reveals the reader controls, or hides them again. Revealed controls hide
   * themselves once the reader stops interacting with them.
   */
  toggleControls: () => void;
  setViewMode: (mode: ViewMode) => void;
  setPageFitMode: (mode: PageFitMode) => void;
  setReadingDirection: (direction: ReadingDirection) => void;
  goToNext: () => void;
  goToPrev: () => void;
  goTo: (index: number) => void;
}

export type ViewerProviderProps<TPage extends ViewerPage = ViewerPage> =
  PropsWithChildren<{
    pages: readonly TPage[];
    plugins?: readonly ViewerPlugin[];
    /**
     * The controlled zero-based page index. When omitted, the viewer manages
     * its own index, starting from `initialIndex`.
     */
    currentIndex?: number;
    initialIndex?: number;
    /** Called when navigation requests a different zero-based page index. */
    onIndexChange?: (index: number) => void;
    initialViewMode?: ViewMode;
    /** The initial page sizing mode. Defaults to fit-to-height. */
    initialPageFitMode?: PageFitMode;
    initialReadingDirection?: ReadingDirection;
    spreadStartIndex?: number;
  }>;

const ViewerContext = createContext<ViewerContextValue | null>(null);
const EMPTY_PLUGINS: readonly ViewerPlugin[] = [];
const CONTROLS_HIDE_DELAY_MS = 2000;

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
};

export const getVisiblePageCount = (
  viewMode: ViewMode,
  currentIndex: number,
  pageCount: number,
  spreadStartIndex: number
): number =>
  viewMode === "double" &&
  currentIndex >= spreadStartIndex &&
  currentIndex + 1 < pageCount
    ? 2
    : 1;

export const ViewerProvider = <TPage extends ViewerPage>({
  pages,
  plugins = EMPTY_PLUGINS,
  children,
  currentIndex: controlledIndex,
  initialIndex = 0,
  onIndexChange,
  initialViewMode = "single",
  initialPageFitMode = "height",
  initialReadingDirection = "rtl",
  spreadStartIndex = 0,
}: ViewerProviderProps<TPage>) => {
  const maxIndex = Math.max(0, pages.length - 1);
  const clampedSpreadStartIndex = clamp(spreadStartIndex, 0, pages.length);
  const [uncontrolledIndex, setUncontrolledIndex] = useState(() =>
    clamp(initialIndex, 0, maxIndex)
  );
  const clampedCurrentIndex = clamp(
    controlledIndex ?? uncontrolledIndex,
    0,
    maxIndex
  );

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  const [pageFitMode, setPageFitMode] =
    useState<PageFitMode>(initialPageFitMode);

  const [readingDirection, setReadingDirection] = useState<ReadingDirection>(
    initialReadingDirection
  );

  const [areControlsVisible, setAreControlsVisible] = useState(false);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const toggleControls = useCallback(() => {
    setAreControlsVisible((areVisible) => {
      if (hideControlsTimeout.current !== null) {
        clearTimeout(hideControlsTimeout.current);
        hideControlsTimeout.current = null;
      }
      if (!areVisible) {
        hideControlsTimeout.current = setTimeout(() => {
          setAreControlsVisible(false);
          hideControlsTimeout.current = null;
        }, CONTROLS_HIDE_DELAY_MS);
      }
      return !areVisible;
    });
  }, []);
  useEffect(
    () => () => {
      if (hideControlsTimeout.current !== null) {
        clearTimeout(hideControlsTimeout.current);
      }
    },
    []
  );

  const goTo = useCallback(
    (index: number) => {
      const nextIndex = clamp(index, 0, maxIndex);
      if (nextIndex === clampedCurrentIndex) {
        return;
      }

      if (controlledIndex === undefined) {
        setUncontrolledIndex(nextIndex);
      }
      onIndexChange?.(nextIndex);
    },
    [clampedCurrentIndex, controlledIndex, maxIndex, onIndexChange]
  );

  const goToNext = useCallback(() => {
    const nextIndex =
      clampedCurrentIndex +
      getVisiblePageCount(
        viewMode,
        clampedCurrentIndex,
        pages.length,
        clampedSpreadStartIndex
      );
    if (nextIndex < pages.length) {
      goTo(nextIndex);
    }
  }, [
    clampedCurrentIndex,
    clampedSpreadStartIndex,
    goTo,
    pages.length,
    viewMode,
  ]);

  const goToPrev = useCallback(() => {
    goTo(
      clampedCurrentIndex -
        (viewMode === "double" && clampedCurrentIndex > clampedSpreadStartIndex
          ? 2
          : 1)
    );
  }, [clampedCurrentIndex, clampedSpreadStartIndex, goTo, viewMode]);

  const value = useMemo<ViewerContextValue<TPage>>(
    () => ({
      areControlsVisible,
      currentIndex: clampedCurrentIndex,
      goTo,
      goToNext,
      goToPrev,
      pageFitMode,
      pages,
      plugins,
      readingDirection,
      setPageFitMode,
      setReadingDirection,
      setViewMode,
      spreadStartIndex: clampedSpreadStartIndex,
      toggleControls,
      viewMode,
    }),
    [
      areControlsVisible,
      pages,
      plugins,
      clampedCurrentIndex,
      clampedSpreadStartIndex,
      toggleControls,
      viewMode,
      pageFitMode,
      readingDirection,
      goTo,
      goToNext,
      goToPrev,
    ]
  );

  return (
    <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
  );
};

export const useViewerContext = <
  TPage extends ViewerPage,
>(): ViewerContextValue<TPage> => {
  const context = useContext(ViewerContext);

  if (context === null) {
    throw new Error("useViewerContext must be used within a ViewerProvider");
  }

  return context as ViewerContextValue<TPage>;
};
