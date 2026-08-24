import { expect, test } from "@playwright/test";

const viewport = ".pcv-viewport";
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
  const encryptedPageResponse = page.waitForResponse((response) =>
    response.url().endsWith("/plugin-pages/page-1.jpg.enc")
  );

  await page.goto("/plugins/decrypted");

  await expect(
    page.getByRole("heading", { name: "Decrypted plugin sample" })
  ).toBeVisible();
  const encryptedResponse = await encryptedPageResponse;
  expect(encryptedResponse.ok()).toBe(true);
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

  const footerPixelDifference = await canvas.evaluate(async (element) => {
    const renderedCanvas = element as HTMLCanvasElement;
    const source = await fetch("/basic-pages/page-1.jpg");
    const bitmap = await createImageBitmap(await source.blob());
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.height = renderedCanvas.height;
    sourceCanvas.width = renderedCanvas.width;
    const context = sourceCanvas.getContext("2d");

    if (context === null) {
      throw new Error("Canvas 2D rendering is unavailable.");
    }

    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixelX = Math.floor(renderedCanvas.width / 2);
    const pixelY = renderedCanvas.height - 48;
    const renderedPixel = renderedCanvas
      .getContext("2d")
      ?.getImageData(pixelX, pixelY, 1, 1).data;
    const sourcePixel = context.getImageData(pixelX, pixelY, 1, 1).data;

    if (renderedPixel === undefined) {
      throw new Error("Rendered canvas is unavailable.");
    }

    return [...renderedPixel].reduce(
      (difference, value, index) =>
        difference + Math.abs(value - sourcePixel[index]),
      0
    );
  });

  expect(footerPixelDifference).toBeGreaterThan(20);
});
