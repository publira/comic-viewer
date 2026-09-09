import { closeDecodedImages } from "./page-image";
import type { DecodedPageImage } from "./page-image";
import { PageDataError } from "./page-load";
import type { PageDataStage } from "./page-load";
import type { ViewerPage } from "./viewer-context";

/** Information about the page currently moving through the data pipeline. */
export interface PageLoadContext {
  /** The source URL currently being processed by the pipeline. */
  url: string;
  /** Cancels work when the page is no longer needed by the viewer. */
  signal: AbortSignal;
  /** The viewer page that owns this load. */
  page: ViewerPage;
}

/** A fetched buffer together with the context that produced it. */
export interface FetchedPageContext extends PageLoadContext {
  buffer: ArrayBuffer;
}

/** A decoded image together with the context that produced it. */
export interface DecodedPageContext extends PageLoadContext {
  image: DecodedPageImage;
}

type PipelineHook<TContext, TResult> =
  | ((context: TContext) => TResult | Promise<TResult | undefined> | undefined)
  | ((context: TContext) => void | Promise<void>);

type PageChangeHook =
  | ((index: number, total: number) => void)
  | ((index: number, total: number) => Promise<void>);

export interface ViewerPlugin {
  /** An optional label that helps identify the plugin during debugging. */
  name?: string;
  /**
   * Runs before a page is fetched. Returning a URL passes it to the next hook;
   * returning nothing leaves the URL unchanged.
   */
  beforeFetch?: PipelineHook<PageLoadContext, string>;
  /**
   * Optionally fetches a page instead of the built-in fetch implementation.
   * When multiple plugins provide this hook, they run in order and the last
   * returned buffer is used.
   */
  customFetch?: PipelineHook<PageLoadContext, ArrayBuffer>;
  /**
   * Runs after a page has been fetched. Returning a buffer passes it to the
   * next hook; returning nothing leaves the current buffer unchanged.
   */
  afterFetch?: PipelineHook<FetchedPageContext, ArrayBuffer>;
  /**
   * Runs after a page has been decoded, so that a plugin can draw on the
   * image or read its pixels without decoding the page a second time.
   * Returning an image passes it to the next hook; returning nothing leaves
   * the current image unchanged.
   *
   * The viewer owns the decoded image: it releases the image a hook replaces,
   * so a hook must not keep drawing from an image it has replaced, and it
   * takes ownership of the image the hook returns.
   */
  afterDecode?: PipelineHook<DecodedPageContext, DecodedPageImage>;
  /** Runs whenever the current page changes. */
  onPageChange?: PageChangeHook;
}

/**
 * Defines a viewer plugin while preserving its inferred hook types.
 */
export const definePlugin = <TPlugin extends ViewerPlugin>(
  plugin: TPlugin
): TPlugin => plugin;

const fetchPage = async ({
  signal,
  url,
}: PageLoadContext): Promise<ArrayBuffer> => {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch page: ${response.status} ${response.statusText}`
    );
  }

  return response.arrayBuffer();
};

/** Labels whatever a pipeline stage throws with the stage it came from. */
const runStage = async <TResult>(
  stage: PageDataStage,
  run: () => Promise<TResult>
): Promise<TResult> => {
  try {
    return await run();
  } catch (error) {
    throw new PageDataError(stage, error);
  }
};

/** Runs the registered URL, fetch, and buffer transforms in registration order. */
export const runDataPipeline = async (
  initialContext: PageLoadContext,
  plugins: readonly ViewerPlugin[]
): Promise<ArrayBuffer> => {
  const context = await runStage("transform", async () => {
    let currentUrl = initialContext.url;

    for (const plugin of plugins) {
      // eslint-disable-next-line no-await-in-loop -- Each hook receives the previous hook's URL.
      const nextUrl = await plugin.beforeFetch?.({
        ...initialContext,
        url: currentUrl,
      });
      if (typeof nextUrl === "string") {
        currentUrl = nextUrl;
      }
    }

    return { ...initialContext, url: currentUrl };
  });

  const fetched = await runStage("fetch", async () => {
    let buffer: ArrayBuffer | undefined;

    for (const plugin of plugins) {
      // eslint-disable-next-line no-await-in-loop -- Custom fetchers run in plugin registration order.
      const customBuffer = await plugin.customFetch?.(context);
      if (customBuffer instanceof ArrayBuffer) {
        buffer = customBuffer;
      }
    }

    return buffer ?? (await fetchPage(context));
  });

  return runStage("transform", async () => {
    let result = fetched;

    for (const plugin of plugins) {
      // eslint-disable-next-line no-await-in-loop -- Each hook receives the previous hook's buffer.
      const nextBuffer = await plugin.afterFetch?.({
        ...context,
        buffer: result,
      });
      if (nextBuffer instanceof ArrayBuffer) {
        result = nextBuffer;
      }
    }

    return result;
  });
};

/** A hook that returns nothing leaves the decoded image as it was. */
const isDecodedImage = (value: unknown): value is DecodedPageImage =>
  typeof value === "object" && value !== null;

/**
 * Runs the decoded-image transforms in registration order. The pipeline owns
 * the image it is given: it releases every image a hook replaces, and releases
 * the one it holds when a hook throws, so only the image it returns is left
 * for the caller to release.
 */
export const runDecodePipeline = (
  context: DecodedPageContext,
  plugins: readonly ViewerPlugin[]
): Promise<DecodedPageImage> =>
  runStage("image-transform", async () => {
    let { image } = context;

    try {
      for (const plugin of plugins) {
        // eslint-disable-next-line no-await-in-loop -- Each hook receives the previous hook's image.
        const nextImage = await plugin.afterDecode?.({ ...context, image });
        if (!isDecodedImage(nextImage) || nextImage === image) {
          continue;
        }

        closeDecodedImages([image]);
        image = nextImage;
      }
    } catch (error) {
      closeDecodedImages([image]);
      throw error;
    }

    return image;
  });

/** Notifies each page-change hook without allowing one plugin to block another. */
export const runPageChangeHooks = async (
  plugins: readonly ViewerPlugin[],
  index: number,
  total: number
): Promise<void> => {
  for (const plugin of plugins) {
    try {
      // eslint-disable-next-line no-await-in-loop -- Page-change hooks are ordered for deterministic analytics.
      await plugin.onPageChange?.(index, total);
    } catch {
      // One plugin must not block page-change reporting for the others.
    }
  }
};
