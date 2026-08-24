import type { ViewerPage } from "./viewer-context";

/** The page pipeline stage that a load failure originated from. */
export type PageLoadStage = "fetch" | "transform" | "decode";

/** The stages the plugin data pipeline runs before an image is decoded. */
export type PageDataStage = Exclude<PageLoadStage, "decode">;

/** A failed page load, reported with the page it belongs to. */
export interface PageLoadError<TPage extends ViewerPage = ViewerPage> {
  /** The error thrown by the fetch, a plugin hook, or the image decoder. */
  cause: unknown;
  /** The zero-based index of the page within the viewer page list. */
  index: number;
  page: TPage;
  stage: PageLoadStage;
}

/**
 * The lifecycle of a page inside the managed image pipeline. Pages rendered
 * through `renderPage` stay `"idle"` because the viewer loads nothing for them.
 */
export type PageLoadStatus = "idle" | "loading" | "loaded" | "error";

/** The load state of a single page, as observed by a page template. */
export interface PageLoadState<TPage extends ViewerPage = ViewerPage> {
  /** The last failure for this page, kept until a retry succeeds. */
  error?: PageLoadError<TPage>;
  index: number;
  page: TPage;
  /** True while a decoded preview stands in for the full-resolution page. */
  placeholder: boolean;
  /** Starts a new attempt for a failed page. Does nothing otherwise. */
  retry: () => void;
  status: PageLoadStatus;
}

/**
 * Records which pipeline stage failed so that a page load can report the stage
 * alongside the original error. It never leaves the loader: `PageLoadError`
 * carries the unwrapped `cause` instead.
 */
export class PageDataError extends Error {
  readonly stage: PageDataStage;

  constructor(stage: PageDataStage, cause: unknown) {
    super(`The page data pipeline failed during the ${stage} stage.`, {
      cause,
    });
    this.name = "PageDataError";
    this.stage = stage;
  }
}

/** Unwraps a pipeline error into the stage and cause reported to consumers. */
export const toPageLoadFailure = (
  error: unknown,
  fallbackStage: PageLoadStage
): { cause: unknown; stage: PageLoadStage } =>
  error instanceof PageDataError
    ? { cause: error.cause, stage: error.stage }
    : { cause: error, stage: fallbackStage };
