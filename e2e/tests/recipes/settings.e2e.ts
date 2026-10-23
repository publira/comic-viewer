import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { revealReaderControl } from "#helpers/reader";
import { viewport } from "#helpers/selectors";

const getSettings = (page: Page) =>
  page.getByRole("form", { name: "Reader settings" });

test("drives the reader from the settings panel outside it", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/recipes/settings");

  const settings = getSettings(page);

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "double"
  );

  await settings.getByRole("radio", { name: "Left to right" }).check();
  await settings.getByRole("radio", { name: "Single page" }).check();
  await settings.getByRole("radio", { name: "Width" }).check();

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-reading-direction",
    "ltr"
  );
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-page-fit-mode",
    "width"
  );
  await expect(
    await revealReaderControl(page, "Double-page view")
  ).toHaveAttribute("aria-pressed", "false");
});

test("reports a toolbar toggle back to the settings panel", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/recipes/settings");

  const settings = getSettings(page);

  const viewModeToggle = await revealReaderControl(page, "Double-page view");
  await viewModeToggle.click();

  const directionToggle = await revealReaderControl(
    page,
    "Reading direction: Right to left"
  );
  await directionToggle.click();

  await expect(
    settings.getByRole("radio", { name: "Single page" })
  ).toBeChecked();
  await expect(
    settings.getByRole("radio", { name: "Left to right" })
  ).toBeChecked();
});

test("keeps a double-page preference through a viewport too narrow for it", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await page.goto("/recipes/settings");

  const settings = getSettings(page);
  const doublePage = settings.getByRole("radio", { name: "Double page" });

  await expect(doublePage).toBeChecked();
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );
  await expect(
    await revealReaderControl(page, "Double-page view")
  ).toBeDisabled();

  await page.setViewportSize({ height: 900, width: 1280 });

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "double"
  );
  await expect(doublePage).toBeChecked();
});
