import { expect, test } from "@playwright/test";

import {
  expectPageOnHalf,
  openShortenedReader,
  turnThroughScreens,
  turnToNextScreen,
} from "#helpers/reader";
import { currentPageSet } from "#helpers/selectors";

test("places the page before the spread start on the half it faces from", async ({
  page,
}) => {
  await openShortenedReader(page, "/features/spreads");

  const coverCanvas = page.locator(`${currentPageSet} canvas`);

  // Reading right to left, the cover faces the page that follows it from the
  // left half, the one the next spread leaves free.
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-side",
    "left"
  );
  await expect(coverCanvas).toHaveAttribute("aria-label", "Page 1");
  await expectPageOnHalf(page, coverCanvas, "left");
});

test("opens the first spread after the spread start", async ({ page }) => {
  await openShortenedReader(page, "/features/spreads");
  await turnToNextScreen(page, "Pages 2-3 of 8");

  const pageCanvases = page.locator(`${currentPageSet} canvas`);

  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(pageCanvases).toHaveCount(2);
  // The spread starts on the right half, so the earlier page takes it and the
  // page facing it takes the left.
  await expect(pageCanvases.first()).toHaveAttribute("aria-label", "Page 3");
  await expect(pageCanvases.last()).toHaveAttribute("aria-label", "Page 2");
  await expectPageOnHalf(page, pageCanvases.first(), "left");
  await expectPageOnHalf(page, pageCanvases.last(), "right");
});

test("keeps the unpaired last page on the side a spread starts on", async ({
  page,
}) => {
  await openShortenedReader(page, "/features/spreads");

  await turnThroughScreens(page, [
    "Pages 2-3 of 8",
    "Pages 4-5 of 8",
    "Pages 6-7 of 8",
    "Page 8 of 8",
  ]);

  const lastPageCanvas = page.locator(`${currentPageSet} canvas`);

  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-side",
    "right"
  );
  await expect(lastPageCanvas).toHaveAttribute("aria-label", "Page 8");
  await expectPageOnHalf(page, lastPageCanvas, "right");
});
