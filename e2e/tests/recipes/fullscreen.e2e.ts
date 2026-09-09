import { expect, test } from "@playwright/test";

import { turnToNextScreen } from "#helpers/reader";
import { currentPageSet, viewport } from "#helpers/selectors";

test("keeps the reading position across a fullscreen round trip", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/recipes/fullscreen");

  const enterFullscreenButton = page.getByRole("button", {
    name: "Enter full screen",
  });
  const exitFullscreenButton = page.getByRole("button", {
    name: "Exit full screen",
  });

  // The control is disabled where the browser refuses fullscreen outright, so
  // this also pins down that the demo reports the API as available.
  await expect(enterFullscreenButton).toBeEnabled();

  await turnToNextScreen(page, "Pages 3-4 of 21");

  const boxedReaderBox = await page.locator(".pcv-root").boundingBox();

  if (boxedReaderBox === null) {
    throw new Error("The reader was not laid out.");
  }

  await enterFullscreenButton.click();

  // The label follows the fullscreenchange event rather than the call, so it
  // only flips once the container really is the element filling the screen.
  await expect(exitFullscreenButton).toBeVisible();
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 21");
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "double"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(
    page.locator(`${currentPageSet} canvas`).first()
  ).toHaveAttribute("data-page-status", "loaded");

  // The screen sizes a fullscreen element, so the reader leaves the box the
  // page keeps it in. Nothing tells the viewer about that: it measures its own
  // container, which is what has to carry the layout across.
  const fullscreenReaderBox = await page.locator(".pcv-root").boundingBox();

  if (fullscreenReaderBox === null) {
    throw new Error("The fullscreen reader was not laid out.");
  }

  expect(fullscreenReaderBox.height).toBeGreaterThan(boxedReaderBox.height);

  await exitFullscreenButton.click();

  await expect(enterFullscreenButton).toBeVisible();
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 21");
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "double"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect
    .poll(async () => {
      const restoredReaderBox = await page.locator(".pcv-root").boundingBox();

      return restoredReaderBox?.height;
    })
    .toBeCloseTo(boxedReaderBox.height, 0);
});
