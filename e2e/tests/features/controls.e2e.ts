import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

import { expectViewMode, revealReaderControl } from "#helpers/reader";
import { pageStatus, viewport } from "#helpers/selectors";

const controlsDemo = "/features/controls";

/** Expects a toggle button to report that it is on, or off. */
const expectPressed = async (toggle: Locator, pressed: boolean) => {
  await expect(toggle).toHaveAttribute("aria-pressed", String(pressed));
};

test("switches the view mode from the toolbar toggle", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(controlsDemo);

  const viewModeToggle = await revealReaderControl(page, "Double-page view");

  await expectPressed(viewModeToggle, true);
  await expect(page.locator(pageStatus)).toHaveText("Pages 1-2 of 21");

  await viewModeToggle.click();

  await expectPressed(viewModeToggle, false);
  await expectViewMode(page, "single");
  await expect(page.locator(pageStatus)).toHaveText("Page 1 of 21");
});

test("disables the view-mode toggle on a viewport too narrow for a spread", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await page.goto(controlsDemo);

  await expectViewMode(page, "single");
  await expect(
    await revealReaderControl(page, "Double-page view")
  ).toBeDisabled();
});

test("switches the reading direction and the page fit from the toolbar", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(controlsDemo);

  const directionToggle = await revealReaderControl(
    page,
    "Reading direction: Right to left"
  );

  await directionToggle.click();

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-reading-direction",
    "ltr"
  );
  // The toggle names the direction it is on, so it answers to the other name
  // once the reader has turned around.
  await expect(
    page.getByRole("button", { name: "Reading direction: Left to right" })
  ).toHaveAttribute("data-reading-direction", "ltr");

  const fitToHeight = await revealReaderControl(page, "Fit to height");
  const fitToWidth = await revealReaderControl(page, "Fit to width");

  await expectPressed(fitToHeight, true);

  await fitToWidth.click();

  await expectPressed(fitToWidth, true);
  await expectPressed(fitToHeight, false);
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-page-fit-mode",
    "width"
  );
});
