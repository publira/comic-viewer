import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectViewMode, revealReaderControl } from "#helpers/reader";
import { viewport } from "#helpers/selectors";

const doublePageView = "Double-page view";

const settingsDemo = "/recipes/settings";

const getSettings = (page: Page) =>
  page.getByRole("form", { name: "Reader settings" });

test("drives the reader from the settings panel outside it", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(settingsDemo);

  const settings = getSettings(page);

  await expectViewMode(page, "double");

  await settings.getByRole("radio", { name: "Left to right" }).check();
  await settings.getByRole("radio", { name: "Single page" }).check();
  await settings.getByRole("radio", { name: "Width" }).check();

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-reading-direction",
    "ltr"
  );
  await expectViewMode(page, "single");
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-page-fit-mode",
    "width"
  );
  await expect(await revealReaderControl(page, doublePageView)).toHaveAttribute(
    "aria-pressed",
    "false"
  );
});

test("reports a toolbar toggle back to the settings panel", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(settingsDemo);

  const settings = getSettings(page);

  const viewModeToggle = await revealReaderControl(page, doublePageView);
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
  await page.goto(settingsDemo);

  const settings = getSettings(page);
  const doublePage = settings.getByRole("radio", { name: "Double page" });

  await expect(doublePage).toBeChecked();
  await expectViewMode(page, "single");
  await expect(await revealReaderControl(page, doublePageView)).toBeDisabled();

  await page.setViewportSize({ height: 900, width: 1280 });

  await expectViewMode(page, "double");
  await expect(doublePage).toBeChecked();
});
