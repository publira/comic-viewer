import { expect, test } from "@playwright/test";

const viewport = ".pcv-viewport";
const viewportTrack = ".pcv-viewport-track";
const currentPageSet = '.pcv-viewport-page-set[data-rail-slot="current"]';

test("renders the basic reader and navigates through a double-page spread", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Basic image loading" })
  ).toBeVisible();
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "double"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 21");

  await page.locator(viewport).click({ position: { x: 640, y: 300 } });
  await page.getByRole("button", { name: "Next page" }).click();

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 21");
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(page.locator(viewportTrack)).toHaveCSS(
    "transition-duration",
    "0s"
  );
});

test("uses a single page at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await page.goto("/");

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  await expect(page.locator(".pcv-page-status")).toHaveText("Page 1 of 21");
});

test("decrypts and renders encrypted pages", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/plugins/decrypted");

  await expect(
    page.getByRole("heading", { name: "Decrypted plugin sample" })
  ).toBeVisible();
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`)
  ).toHaveAttribute("data-page-status", "loaded");
});

test("applies the watermark plugin before rendering a page", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/plugins/watermark");

  await expect(
    page.getByRole("heading", { name: "Text watermark plugin sample" })
  ).toBeVisible();
  const canvas = page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`);
  await expect(canvas).toHaveAttribute("data-page-status", "loaded");
});

test("keeps the two pages of a spread meeting at the gutter", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");

  // Both demos size the viewer to the aspect ratio of a full spread, so the
  // pages fill it exactly. Shortening the viewer makes it wider than the pages
  // are, which is where the halves of a spread used to drift apart.
  await page.addStyleTag({
    content: ".pcv-root { height: 420px !important; }",
  });

  const pageCanvases = page.locator(`${currentPageSet} canvas`);
  await expect(pageCanvases).toHaveCount(2);
  await expect(pageCanvases.first()).toHaveAttribute(
    "data-page-status",
    "loaded"
  );
  await expect(pageCanvases.last()).toHaveAttribute(
    "data-page-status",
    "loaded"
  );

  const pageSetBox = await page.locator(currentPageSet).boundingBox();
  const leftPageBox = await pageCanvases.first().boundingBox();
  const rightPageBox = await pageCanvases.last().boundingBox();

  if (pageSetBox === null || leftPageBox === null || rightPageBox === null) {
    throw new Error("The current spread was not laid out.");
  }

  // The pages are narrower than the halves they occupy, so this only holds
  // once each page is aligned against the centre line.
  expect(leftPageBox.width).toBeLessThan(pageSetBox.width / 2);
  expect(leftPageBox.x + leftPageBox.width).toBeCloseTo(rightPageBox.x, 0);
  expect(rightPageBox.x).toBeCloseTo(pageSetBox.x + pageSetBox.width / 2, 0);
});
