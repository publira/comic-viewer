import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { composeClassName } from "./class-names";
import type { PageLoadError, PageLoadState, PageLoadStatus } from "./page-load";
import type { PageImage } from "./use-viewport-images";
import type { ViewerPage } from "./viewer-context";

/** A page template rendered either as static markup or per visible page. */
export type ViewportChildren<TPage extends ViewerPage> =
  | ReactNode
  | ((page: TPage, index: number) => ReactNode);

interface ViewportPageContextValue {
  error?: PageLoadError;
  image?: PageImage;
  index: number;
  page: ViewerPage;
  retry: () => void;
  status: PageLoadStatus;
}

const ViewportPageContext = createContext<ViewportPageContextValue | null>(
  null
);

const useViewportPageContext = (
  consumerName: string
): ViewportPageContextValue => {
  const context = useContext(ViewportPageContext);
  if (context === null) {
    throw new Error(
      `${consumerName} must be used within a page managed by Viewport.`
    );
  }

  return context;
};

/**
 * Reads the load state of the page being rendered by a Viewport page template,
 * so a template can show a spinner, render an error state, or offer a retry.
 * Pages rendered through `renderPage` report `"idle"` because the viewer loads
 * nothing on their behalf.
 */
export const usePageLoadState = <
  TPage extends ViewerPage = ViewerPage,
>(): PageLoadState<TPage> => {
  const { error, image, index, page, retry, status } =
    useViewportPageContext("usePageLoadState");

  return useMemo(
    () => ({
      error: error as PageLoadError<TPage> | undefined,
      index,
      page: page as TPage,
      placeholder: image?.placeholder ?? false,
      retry,
      status,
    }),
    [error, image, index, page, retry, status]
  );
};

export type PageCanvasProps = Omit<
  ComponentPropsWithoutRef<"canvas">,
  | "aria-busy"
  | "aria-label"
  | "data-page-status"
  | "data-placeholder"
  | "height"
  | "width"
>;

/** Draws the decoded viewport page or its preview without exposing an image element. */
export const PageCanvas = ({ className, ...props }: PageCanvasProps) => {
  const {
    image: pageImage,
    page,
    status,
  } = useViewportPageContext("PageCanvas");
  const image = pageImage?.bitmap;
  const placeholder = pageImage?.placeholder ?? false;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }

    if (image === undefined) {
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }

    const imageHeight =
      "naturalHeight" in image ? image.naturalHeight : image.height;
    const imageWidth =
      "naturalWidth" in image ? image.naturalWidth : image.width;
    canvas.height = page.height ?? imageHeight;
    canvas.width = page.width ?? imageWidth;
    context.filter = placeholder ? "blur(16px)" : "none";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.filter = "none";
  }, [image, page.height, page.width, placeholder]);

  return (
    <canvas
      {...props}
      ref={canvasRef}
      // A placeholder still counts as busy: the full page has not been drawn yet.
      aria-busy={
        ((image === undefined || placeholder) && status !== "error") ||
        undefined
      }
      aria-label={page.title}
      className={composeClassName("pcv-page-canvas", className)}
      data-page-status={status}
      data-placeholder={placeholder || undefined}
      height={page.height}
      width={page.width}
    />
  );
};

export type ViewportPageProps = ComponentPropsWithoutRef<"div">;

/** Provides the page wrapper for a Viewport page template. */
export const ViewportPage = ({
  children,
  className,
  ...props
}: ViewportPageProps) => (
  <div {...props} className={composeClassName("pcv-page", className)}>
    {children ?? <PageCanvas />}
  </div>
);

interface ViewportPageInstanceProps<TPage extends ViewerPage> {
  children?: ViewportChildren<TPage>;
  error?: PageLoadError<TPage>;
  image?: PageImage;
  index: number;
  page: TPage;
  renderPage?: (page: TPage, index: number) => ReactNode;
  retryPage: (index: number) => void;
  status: PageLoadStatus;
}

/** Renders one visible page from the template that the viewport was given. */
export const ViewportPageInstance = <TPage extends ViewerPage>({
  children,
  error,
  image,
  index,
  page,
  renderPage,
  retryPage,
  status,
}: ViewportPageInstanceProps<TPage>) => {
  const retry = useCallback(() => {
    retryPage(index);
  }, [index, retryPage]);
  const contextValue = useMemo(
    () => ({ error, image, index, page, retry, status }),
    [error, image, index, page, retry, status]
  );
  let content: ReactNode;

  if (children === undefined) {
    content =
      renderPage === undefined ? <ViewportPage /> : renderPage(page, index);
  } else {
    content = typeof children === "function" ? children(page, index) : children;
  }

  return (
    <ViewportPageContext.Provider value={contextValue}>
      {content}
    </ViewportPageContext.Provider>
  );
};
