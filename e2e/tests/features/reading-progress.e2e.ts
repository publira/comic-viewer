import { expect, test } from "@playwright/test";

import { revealReaderControls } from "#helpers/reader";
import {
  dragSliderThumbTo,
  dragSliderThumbToFraction,
  getSliderGeometry,
  getSliderX,
} from "#helpers/reading-progress";
import { currentPageSet, progressSlider, toolbar } from "#helpers/selectors";

test("scrubs to a page by dragging the reading-progress thumb", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");
  await revealReaderControls(page);

  const geometry = await getSliderGeometry(page);

  await page.mouse.move(getSliderX(geometry, 0), geometry.centreY);
  await page.mouse.down();
  await page.mouse.move(getSliderX(geometry, 10), geometry.centreY, {
    steps: 10,
  });

  // The status follows the thumb, while the document waits for the drag to be
  // released rather than turning at every index the thumb passes over.
  await expect(page.locator(".pcv-page-status")).toHaveText(
    "Pages 11-12 of 21"
  );
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`)
  ).toBeVisible();

  await page.mouse.up();

  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 11"]`)
  ).toBeVisible();
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 12"]`)
  ).toBeVisible();
  await expect(page.locator(".pcv-page-status")).toHaveText(
    "Pages 11-12 of 21"
  );
});

test("steps through the document with the arrow keys on the reading progress", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/features/ltr");
  await revealReaderControls(page);
  await page.locator(progressSlider).focus();

  // One step of a range input is one index, which in double-page mode falls on
  // the facing page of the spread the reader is already on, so the key moves
  // on to the spread it was heading for.
  await page.keyboard.press("ArrowRight");

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 21");
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 3"]`)
  ).toBeVisible();

  await page.keyboard.press("ArrowLeft");

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 21");

  await page.keyboard.press("End");

  // The last page of an odd document has no page to face, and the slider ends
  // on it as the page-turn controls do.
  await expect(page.locator(".pcv-page-status")).toHaveText("Page 21 of 21");
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
});

test("snaps a scrub to the page a spread starts from", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/features/spreads");
  await revealReaderControls(page);

  await expect(page.locator(".pcv-page-status")).toHaveText("Page 1 of 8");

  await dragSliderThumbTo(page, 4);

  // The spreads of this document are counted from the second page, so index 4
  // is the facing page of the spread that opens at index 3, and a spread is
  // addressed by the page it starts from.
  await expect(page.locator(progressSlider)).toHaveValue("3");
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 4-5 of 8");
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
});

test("runs the reading progress the way the reader turns pages", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");
  await revealReaderControls(page);

  // A quarter of the way in from the left edge is three quarters of the way
  // through a document read from right to left.
  await dragSliderThumbToFraction(page, 0.25);

  await expect(page.locator(".pcv-page-status")).toHaveText(
    "Pages 15-16 of 21"
  );

  await page.goto("/features/ltr");
  await revealReaderControls(page);
  await dragSliderThumbToFraction(page, 0.25);

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 5-6 of 21");
});

test("keeps the reader controls up for the length of a scrub", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");
  await revealReaderControls(page);

  const geometry = await getSliderGeometry(page);

  await page.mouse.move(getSliderX(geometry, 0), geometry.centreY);
  await page.mouse.down();
  // A finger that drags past the edge of the toolbar leaves it, which is what
  // used to let the controls hide and turn inert underneath it.
  await page.mouse.move(getSliderX(geometry, 6), geometry.centreY - 300, {
    steps: 10,
  });
  await page.waitForTimeout(2500);

  await expect(page.locator(toolbar)).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 7-8 of 21");

  await page.mouse.up();

  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 7"]`)
  ).toBeVisible();

  // A captured pointer reports no boundary event, so the toolbar only learns
  // that the pointer has left it once the released one moves again, and the
  // slider holds the controls open through its focus for as long as it keeps
  // it. The drag holds the controls on top of both, and this is what shows
  // that its own hold ended with it rather than outlasting it.
  await page.mouse.move(getSliderX(geometry, 6) - 20, geometry.centreY - 300);
  await page.locator(progressSlider).blur();

  await expect(page.locator(toolbar)).toHaveAttribute("aria-hidden", "true");
});
