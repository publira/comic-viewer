import { expect, test } from "@playwright/test";

import {
  openReader,
  turnThroughScreens,
  turnToNextScreen,
} from "#helpers/reader";
import { currentPageSet, viewport } from "#helpers/selectors";

test("gives a page that is a whole spread both halves of the page set", async ({
  page,
}) => {
  await openReader(page, "/features/spread-page");

  // Pages 1 and 2 pair. The spread cannot share a sheet, so it moves on to
  // one of its own and leaves page 3 facing the blank half before it.
  await turnThroughScreens(page, ["Page 3 of 8", "Page 4 of 8"]);

  const spreadCanvas = page.locator(`${currentPageSet} canvas`);
  const spreadPage = page
    .locator(`${currentPageSet} [data-page-layout="spread"]`)
    .first();

  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  // A spread covers both halves, so it takes neither side of the gutter.
  await expect(page.locator(currentPageSet)).not.toHaveAttribute(
    "data-page-side"
  );
  await expect(spreadCanvas).toHaveAttribute("aria-label", "Page 4");
  await expect(spreadCanvas).toHaveAttribute("width", "1600");

  const pageSetBox = await page.locator(currentPageSet).boundingBox();
  const spreadBox = await spreadPage.boundingBox();

  if (pageSetBox === null || spreadBox === null) {
    throw new Error("The spread page was not laid out.");
  }

  // An ordinary page is limited to half the set, so the whole width is what
  // tells the spread apart from one squeezed into a half.
  expect(spreadBox.width).toBeCloseTo(pageSetBox.width, 0);

  // The pages after the spread pair again on the halves print gives them.
  await turnToNextScreen(page, "Pages 5-6 of 8");
});

test("shows a page that is a whole spread whole at a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await page.goto("/features/spread-page");

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );

  await turnThroughScreens(page, ["Page 2 of 8", "Page 3 of 8", "Page 4 of 8"]);

  const spreadCanvas = page.locator(`${currentPageSet} canvas`);
  const spreadPage = page
    .locator(`${currentPageSet} [data-page-layout="spread"]`)
    .first();

  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  await expect(spreadCanvas).toHaveAttribute("aria-label", "Page 4");
  // The whole landscape image is drawn on one canvas and fitted inside it, so
  // the reader is never shown one half of the picture.
  await expect(spreadCanvas).toHaveAttribute("width", "1600");
  await expect(spreadCanvas).toHaveCSS("object-fit", "contain");

  const pageBox = await spreadPage.boundingBox();
  const canvasBox = await spreadCanvas.boundingBox();

  if (pageBox === null || canvasBox === null) {
    throw new Error("The spread page was not laid out.");
  }

  expect(canvasBox.width).toBeCloseTo(pageBox.width, 0);

  // One page turn steps over the spread rather than onto a second half of it.
  await turnToNextScreen(page, "Page 5 of 8");
});
