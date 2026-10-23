import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { currentPageSet, viewport } from "#helpers/selectors";

const phone = { height: 844, width: 390 };
const desktop = { height: 900, width: 1280 };

/** Records the rendition of page 1 the reader requests each time it asks. */
const recordFirstPageRequests = (page: Page): string[] => {
  const renditions: string[] = [];

  page.on("request", (request) => {
    const rendition = /^\/srcset-pages\/page-1-(?<width>\d+w)\.jpg$/u.exec(
      new URL(request.url()).pathname
    )?.groups?.width;
    if (rendition !== undefined) {
      renditions.push(rendition);
    }
  });

  return renditions;
};

const firstPage = (page: Page) =>
  page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`);

test("fetches the smallest rendition on a phone", async ({ page }) => {
  const renditions = recordFirstPageRequests(page);
  await page.setViewportSize(phone);
  await page.goto("/features/srcset");

  await expect(firstPage(page)).toHaveAttribute("data-page-status", "loaded");
  // A phone draws the page narrower than 400 pixels.
  expect(renditions).toEqual(["400w"]);
});

test("fetches the middle rendition on a desktop display", async ({ page }) => {
  const renditions = recordFirstPageRequests(page);
  await page.setViewportSize(desktop);
  await page.goto("/features/srcset");

  await expect(firstPage(page)).toHaveAttribute("data-page-status", "loaded");
  expect(renditions).toEqual(["800w"]);
});

test.describe("on a high-density display", () => {
  test.use({ deviceScaleFactor: 2 });

  test("fetches the largest rendition", async ({ page }) => {
    const renditions = recordFirstPageRequests(page);
    await page.setViewportSize(desktop);
    await page.goto("/features/srcset");

    await expect(firstPage(page)).toHaveAttribute("data-page-status", "loaded");
    expect(renditions).toEqual(["1600w"]);
  });
});

test("upgrades the rendition as the viewport grows and keeps it as it shrinks", async ({
  page,
}) => {
  const renditions = recordFirstPageRequests(page);
  await page.setViewportSize(phone);
  await page.goto("/features/srcset");

  await expect(firstPage(page)).toHaveAttribute("data-page-status", "loaded");
  expect(renditions).toEqual(["400w"]);

  await page.setViewportSize(desktop);

  await expect.poll(() => renditions).toEqual(["400w", "800w"]);
  // The page stays drawn while the larger rendition replaces the smaller one.
  await expect(firstPage(page)).toHaveAttribute("data-page-status", "loaded");

  await page.setViewportSize(phone);
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );
  // Leave the loader time to start a request it should not make.
  await page.waitForTimeout(500);

  // A page that holds a larger image keeps it rather than fetching a smaller one.
  expect(renditions).toEqual(["400w", "800w"]);
  await expect(firstPage(page)).toHaveAttribute("data-page-status", "loaded");
});

interface Decode {
  resizeWidth?: number;
  width: number;
}

/** Records the width every image is decoded at, and the width asked for. */
const recordDecodes = async (page: Page): Promise<() => Promise<Decode[]>> => {
  await page.addInitScript(() => {
    const decodes: Decode[] = [];
    const decode = globalThis.createImageBitmap.bind(globalThis);
    Object.assign(globalThis, {
      createImageBitmap: async (
        image: ImageBitmapSource,
        options?: ImageBitmapOptions
      ) => {
        const bitmap = await decode(image, options);
        decodes.push({
          resizeWidth: options?.resizeWidth,
          width: bitmap.width,
        });
        return bitmap;
      },
      decodes,
    });
  });

  return () =>
    page.evaluate(
      () => (globalThis as unknown as { decodes: Decode[] }).decodes
    );
};

const drawnWidth = (page: Page) =>
  firstPage(page).evaluate((canvas) => canvas.getBoundingClientRect().width);

test("decodes a rendition no wider than the page is drawn", async ({
  page,
}) => {
  const readDecodes = await recordDecodes(page);
  await page.setViewportSize(phone);
  await page.goto("/features/srcset");

  await expect(firstPage(page)).toHaveAttribute("data-page-status", "loaded");
  const width = Math.ceil(await drawnWidth(page));
  const decodes = await readDecodes();

  // The 400w file comes out as wide as the page is drawn on a phone.
  expect(width).toBeLessThan(400);
  expect(decodes).toContainEqual({ resizeWidth: width, width });
  expect(Math.max(...decodes.map((decode) => decode.width))).toBeLessThan(400);
});

test("decodes a page wider without a new request as it widens", async ({
  page,
}) => {
  const renditions = recordFirstPageRequests(page);
  const readDecodes = await recordDecodes(page);
  await page.setViewportSize(phone);
  await page.goto("/features/srcset");

  await expect(firstPage(page)).toHaveAttribute("data-page-status", "loaded");
  const narrowWidth = Math.ceil(await drawnWidth(page));

  // Still narrower than the 400w rendition, so no other one is selected.
  await page.setViewportSize({ ...phone, width: 420 });
  const wideWidth = Math.ceil(await drawnWidth(page));
  expect(wideWidth).toBeGreaterThan(narrowWidth);
  expect(wideWidth).toBeLessThan(400);

  await expect
    .poll(async () => {
      const decodes = await readDecodes();
      return decodes.map((decode) => decode.width);
    })
    .toContain(wideWidth);
  expect(renditions).toEqual(["400w"]);
  await expect(firstPage(page)).toHaveAttribute("data-page-status", "loaded");
});
