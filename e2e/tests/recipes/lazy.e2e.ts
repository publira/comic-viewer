import { expect, test } from "@playwright/test";

import { turnToNextScreen } from "#helpers/reader";
import { currentPageSet } from "#helpers/selectors";

test("counts the whole document while its page metadata resolves", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/recipes/lazy");

  await expect(
    page.getByRole("heading", { name: "Lazy page metadata" })
  ).toBeVisible();

  // Navigation counts the pages the document holds, not the ones resolved so
  // far, so the status is right before any metadata has arrived.
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 7");
  // The pages of the spread keep their places while their metadata is on its
  // way, rather than leaving the spread to collapse.
  await expect(page.locator(`${currentPageSet} .pcv-page-pending`)).toHaveCount(
    2
  );

  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`)
  ).toHaveAttribute("data-page-status", "loaded");
  await expect(page.locator(`${currentPageSet} .pcv-page-pending`)).toHaveCount(
    0
  );
  // Four pages on either side of the current one, and no more, are asked for.
  await expect(
    page.getByRole("status", { name: "Metadata requests" })
  ).toHaveText("5");
  // The rail holds two spreads of this document, and `imagePreloadSpreads` of
  // one loads the spread after them, as far as the resolved metadata reaches.
  await expect(
    page.getByRole("status", { name: "Page images decoded" })
  ).toHaveText("5");
});

test("appends the next chapter as the reader reaches the end of the loaded pages", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/recipes/lazy");

  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`)
  ).toHaveAttribute("data-page-status", "loaded");
  await expect(
    page.getByRole("status", { name: "Pages available" })
  ).toHaveText("7 of 21");

  await turnToNextScreen(page, "Pages 3-4 of 7");
  // Two pages from the end of the loaded chapter, the next one is appended,
  // and the reader keeps its place while the document grows around it.
  await turnToNextScreen(page, "Pages 5-6 of 14");

  await expect(
    page.getByRole("status", { name: "Pages available" })
  ).toHaveText("14 of 21");
  await expect(
    page.getByRole("status", { name: "Chapters loaded" })
  ).toHaveText("2 of 3");
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 5"]`)
  ).toHaveAttribute("data-page-status", "loaded");
});
