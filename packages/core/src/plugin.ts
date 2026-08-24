import { PageDataError } from "./page-load";
import type { PageDataStage } from "./page-load";

type TransformHook<TInput, TOutput = TInput> =
  | ((value: TInput) => TOutput | Promise<TOutput | undefined> | undefined)
  | ((value: TInput) => void)
  | ((value: TInput) => Promise<void>);

type PageChangeHook =
  | ((index: number, total: number) => void)
  | ((index: number, total: number) => Promise<void>);

export interface ViewerPlugin {
  /** An optional label that helps identify the plugin during debugging. */
  name?: string;
  /**
   * Runs before a page is fetched. Returning a URL passes it to the next hook.
   * Returning nothing leaves the current URL unchanged.
   */
  beforeFetch?: TransformHook<string>;
  /**
   * Optionally fetches a page instead of the built-in fetch implementation.
   * When multiple plugins provide this hook, they run in order and the last
   * returned buffer is used.
   */
  customFetch?: TransformHook<string, ArrayBuffer>;
  /**
   * Runs after a page has been fetched. Returning a buffer passes it to the
   * next hook; returning nothing leaves the current buffer unchanged.
   */
  afterFetch?: TransformHook<ArrayBuffer>;
  /** Runs whenever the current page changes. */
  onPageChange?: PageChangeHook;
}

/**
 * Defines a viewer plugin while preserving its inferred hook types.
 */
export const definePlugin = <TPlugin extends ViewerPlugin>(
  plugin: TPlugin
): TPlugin => plugin;

const fetchPage = async (
  url: string,
  signal?: AbortSignal
): Promise<ArrayBuffer> => {
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
  initialUrl: string,
  plugins: readonly ViewerPlugin[],
  signal?: AbortSignal
): Promise<ArrayBuffer> => {
  const url = await runStage("transform", async () => {
    let currentUrl = initialUrl;

    for (const plugin of plugins) {
      // eslint-disable-next-line no-await-in-loop -- Each hook receives the previous hook's URL.
      const nextUrl = await plugin.beforeFetch?.(currentUrl);
      if (typeof nextUrl === "string") {
        currentUrl = nextUrl;
      }
    }

    return currentUrl;
  });

  const fetched = await runStage("fetch", async () => {
    let buffer: ArrayBuffer | undefined;

    for (const plugin of plugins) {
      // eslint-disable-next-line no-await-in-loop -- Custom fetchers run in plugin registration order.
      const customBuffer = await plugin.customFetch?.(url);
      if (customBuffer instanceof ArrayBuffer) {
        buffer = customBuffer;
      }
    }

    return buffer ?? (await fetchPage(url, signal));
  });

  return runStage("transform", async () => {
    let result = fetched;

    for (const plugin of plugins) {
      // eslint-disable-next-line no-await-in-loop -- Each hook receives the previous hook's buffer.
      const nextBuffer = await plugin.afterFetch?.(result);
      if (nextBuffer instanceof ArrayBuffer) {
        result = nextBuffer;
      }
    }

    return result;
  });
};

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
