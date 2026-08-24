import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import type { PageImage } from "./use-viewport-images";
import type { ViewerPage } from "./viewer-context";

/** A page template rendered either as static markup or per visible page. */
export type ViewportChildren<TPage extends ViewerPage> =
  | ReactNode
  | ((page: TPage, index: number) => ReactNode);

interface ViewportPageContextValue {
  image?: PageImage;
  page: ViewerPage;
}

const ViewportPageContext = createContext<ViewportPageContextValue | null>(
  null
);

const useViewportPageContext = (): ViewportPageContextValue => {
  const context = useContext(ViewportPageContext);
  if (context === null) {
    throw new Error(
      "PageCanvas must be rendered within a page managed by Viewport."
    );
  }

  return context;
};

export type PageCanvasProps = Omit<
  ComponentPropsWithoutRef<"canvas">,
  "aria-busy" | "aria-label" | "data-placeholder" | "height" | "width"
>;

/** Draws the decoded viewport page or its preview without exposing an image element. */
export const PageCanvas = ({ className, ...props }: PageCanvasProps) => {
  const { image: pageImage, page } = useViewportPageContext();
  const image = pageImage?.bitmap;
  const placeholder = pageImage?.placeholder ?? false;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || image === undefined) {
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
      aria-busy={image === undefined || undefined}
      aria-label={page.title}
      className={`pcv-page-canvas${className === undefined ? "" : ` ${className}`}`}
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
  <div
    {...props}
    className={`pcv-page${className === undefined ? "" : ` ${className}`}`}
  >
    {children ?? <PageCanvas />}
  </div>
);

interface ViewportPageInstanceProps<TPage extends ViewerPage> {
  children?: ViewportChildren<TPage>;
  image?: PageImage;
  index: number;
  page: TPage;
  renderPage?: (page: TPage, index: number) => ReactNode;
}

/** Renders one visible page from the template that the viewport was given. */
export const ViewportPageInstance = <TPage extends ViewerPage>({
  children,
  image,
  index,
  page,
  renderPage,
}: ViewportPageInstanceProps<TPage>) => {
  const contextValue = useMemo(() => ({ image, page }), [image, page]);
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
