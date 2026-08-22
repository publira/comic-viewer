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
  }>;

const ViewerContext = createContext<ViewerContextValue | null>(null);

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
};

const getStep = (viewMode: ViewMode): number => (viewMode === "double" ? 2 : 1);

export const ViewerProvider = <TPage extends ViewerPage>({
  pages,
  plugins = [],
  children,
  initialIndex = 0,
  initialViewMode = "single",
  initialReadingDirection = "rtl",
}: ViewerProviderProps<TPage>) => {
  const maxIndex = Math.max(0, pages.length - 1);
  const [currentIndex, setCurrentIndex] = useState(() =>
    clamp(initialIndex, 0, maxIndex)
  );
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
      clamp(prevIndex + getStep(viewMode), 0, maxIndex)
    );
  }, [maxIndex, viewMode]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      clamp(prevIndex - getStep(viewMode), 0, maxIndex)
    );
  }, [maxIndex, viewMode]);

  const value = useMemo<ViewerContextValue<TPage>>(
    () => ({
      currentIndex,
      goTo,
      goToNext,
      goToPrev,
      pages,
      plugins,
      readingDirection,
      setReadingDirection,
      setViewMode,
      viewMode,
    }),
    [
      pages,
      plugins,
      currentIndex,
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
