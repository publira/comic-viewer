import { expect, test } from "@playwright/test";

import { expectPageLoaded } from "#helpers/reader";
import { currentPageSet } from "#helpers/selectors";

test("decrypts and renders encrypted pages", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/plugins/decrypted");

  await expect(
    page.getByRole("heading", { name: "Decrypted plugin sample" })
  ).toBeVisible();
  await expectPageLoaded(
    page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`)
  );
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
  await expectPageLoaded(canvas);
});
