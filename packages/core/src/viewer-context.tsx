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
    initialIndex?: number;
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
  initialIndex = 0,
  initialViewMode = "single",
  initialReadingDirection = "rtl",
  spreadStartIndex = 0,
}: ViewerProviderProps<TPage>) => {
  const maxIndex = Math.max(0, pages.length - 1);
  const clampedSpreadStartIndex = clamp(spreadStartIndex, 0, pages.length);
  const [currentIndex, setCurrentIndex] = useState(() =>
    clamp(initialIndex, 0, maxIndex)
  );
  const clampedCurrentIndex = clamp(currentIndex, 0, maxIndex);

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  const [readingDirection, setReadingDirection] = useState<ReadingDirection>(
    initialReadingDirection
  );

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(clamp(index, 0, maxIndex));
    },
    [maxIndex]
  );

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      clamp(
        prevIndex +
          getVisiblePageCount(
            viewMode,
            prevIndex,
            pages.length,
            clampedSpreadStartIndex
          ),
        0,
        maxIndex
      )
    );
  }, [clampedSpreadStartIndex, maxIndex, pages.length, viewMode]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      clamp(
        prevIndex -
          (viewMode === "double" && prevIndex > clampedSpreadStartIndex
            ? 2
            : 1),
        0,
        maxIndex
      )
    );
  }, [clampedSpreadStartIndex, maxIndex, viewMode]);

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
