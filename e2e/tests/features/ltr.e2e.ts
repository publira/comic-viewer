import { expect, test } from "@playwright/test";

import {
  expectPageOnHalf,
  openShortenedReader,
  turnThroughScreens,
} from "#helpers/reader";
import { currentPageSet, viewport } from "#helpers/selectors";

test("opens a left-to-right spread in reading order", async ({ page }) => {
  await openShortenedReader(page, "/features/ltr");

  const pageCanvases = page.locator(`${currentPageSet} canvas`);

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-reading-direction",
    "ltr"
  );
  await expect(pageCanvases).toHaveCount(2);
  await expect(pageCanvases.first()).toHaveAttribute("aria-label", "Page 1");
  await expect(pageCanvases.last()).toHaveAttribute("aria-label", "Page 2");
  await expectPageOnHalf(page, pageCanvases.first(), "left");
  await expectPageOnHalf(page, pageCanvases.last(), "right");
});

test("keeps the unpaired last page of a left-to-right reader on the left", async ({
  page,
}) => {
  await openShortenedReader(page, "/features/ltr");

  const spreadStatuses = [3, 5, 7, 9, 11, 13, 15, 17, 19].map(
    (firstPage) => `Pages ${firstPage}-${firstPage + 1} of 21`
  );

  await turnThroughScreens(page, [...spreadStatuses, "Page 21 of 21"]);

  const lastPageCanvas = page.locator(`${currentPageSet} canvas`);

  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-side",
    "left"
  );
  await expect(lastPageCanvas).toHaveAttribute("aria-label", "Page 21");
  await expectPageOnHalf(page, lastPageCanvas, "left");
});
