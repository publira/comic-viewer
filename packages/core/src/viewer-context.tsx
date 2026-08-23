import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { PropsWithChildren } from "react";

import type { ViewerPlugin } from "./plugin";

export type ViewMode = "single" | "double";
export type ReadingDirection = "rtl" | "ltr";

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
  readingDirection: ReadingDirection;
  spreadStartIndex: number;
  setViewMode: (mode: ViewMode) => void;
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
    initialReadingDirection?: ReadingDirection;
    spreadStartIndex?: number;
  }>;

const ViewerContext = createContext<ViewerContextValue | null>(null);
const EMPTY_PLUGINS: readonly ViewerPlugin[] = [];

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

  const [readingDirection, setReadingDirection] = useState<ReadingDirection>(
    initialReadingDirection
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
      currentIndex: clampedCurrentIndex,
      goTo,
      goToNext,
      goToPrev,
      pages,
      plugins,
      readingDirection,
      setReadingDirection,
      setViewMode,
      spreadStartIndex: clampedSpreadStartIndex,
      viewMode,
    }),
    [
      pages,
      plugins,
      clampedCurrentIndex,
      clampedSpreadStartIndex,
      viewMode,
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
