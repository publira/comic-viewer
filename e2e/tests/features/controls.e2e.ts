import { expect, test } from "@playwright/test";

import { revealReaderControl } from "#helpers/reader";
import { viewport } from "#helpers/selectors";

test("switches the view mode from the toolbar toggle", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/features/controls");

  const viewModeToggle = await revealReaderControl(page, "Double-page view");

  await expect(viewModeToggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 21");

  await viewModeToggle.click();

  await expect(viewModeToggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );
  await expect(page.locator(".pcv-page-status")).toHaveText("Page 1 of 21");
});

test("disables the view-mode toggle on a viewport too narrow for a spread", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await page.goto("/features/controls");

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );
  await expect(
    await revealReaderControl(page, "Double-page view")
  ).toBeDisabled();
});

test("switches the reading direction and the page fit from the toolbar", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/features/controls");

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

  await expect(fitToHeight).toHaveAttribute("aria-pressed", "true");

  await fitToWidth.click();

  await expect(fitToWidth).toHaveAttribute("aria-pressed", "true");
  await expect(fitToHeight).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-page-fit-mode",
    "width"
  );
});
