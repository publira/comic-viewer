import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { currentPageSet } from "#helpers/selectors";

/** Records the path of every page image the reader requests from here on. */
const recordPageImageRequests = (page: Page): string[] => {
  const paths: string[] = [];

  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (/^\/(?:basic|srcset)-pages\//u.test(pathname)) {
      paths.push(pathname);
    }
  });

  return paths;
};

test("fetches the larger rendition once the viewport grows past the smaller one", async ({
  page,
}) => {
  const requestedPaths = recordPageImageRequests(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/features/srcset");

  const firstPage = page.locator(
    `${currentPageSet} canvas[aria-label="Page 1"]`
  );
  await expect(firstPage).toHaveAttribute("data-page-status", "loaded");
  // A phone draws the page narrower than 400 pixels, so the small one serves.
  expect(requestedPaths).toContain("/srcset-pages/page-1-400w.jpg");
  expect(requestedPaths).not.toContain("/basic-pages/page-1.jpg");

  await page.setViewportSize({ height: 900, width: 1280 });

  await expect.poll(() => requestedPaths).toContain("/basic-pages/page-1.jpg");
  // The page stays drawn while the larger rendition replaces the smaller one.
  await expect(firstPage).toHaveAttribute("data-page-status", "loaded");
});
