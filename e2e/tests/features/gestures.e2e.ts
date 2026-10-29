import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { openReader } from "#helpers/reader";
import { pageStatus, toolbar, viewport } from "#helpers/selectors";

const firstSpread = "Pages 1-2 of 21";
const secondSpread = "Pages 3-4 of 21";

const gesturesDemo = "/features/gestures";

/**
 * Clicks the viewport this far into its width, above the page-turn buttons the
 * revealed controls place on its edges.
 */
const clickViewportAt = async (page: Page, ratio: number) => {
  const box = await page.locator(viewport).boundingBox();

  if (box === null) {
    throw new Error("The viewport was not laid out.");
  }

  await page.locator(viewport).click({
    position: { x: box.width * ratio, y: box.height / 4 },
  });
};

const setGesture = async (page: Page, name: string, checked: boolean) => {
  await page
    .getByRole("group", { name: "Gestures" })
    .getByRole("checkbox", { exact: true, name })
    .setChecked(checked);
};

test("turns pages with the arrow keys only while the viewport is focused", async ({
  page,
}) => {
  await openReader(page, gesturesDemo);

  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(viewport)).not.toBeFocused();
  await expect(page.locator(pageStatus)).toHaveText(firstSpread);

  await page.locator(viewport).focus();
  await page.keyboard.press("ArrowLeft");

  await expect(page.locator(pageStatus)).toHaveText(secondSpread);
});

test("turns pages with the arrow keys from anywhere with the global scope", async ({
  page,
}) => {
  await openReader(page, gesturesDemo);
  await setGesture(page, "Arrow keys from anywhere on the page", true);

  // A key pressed on the checkbox would stay with it, so a click on the
  // heading, which takes no focus, hands the focus back to the page.
  await page.getByRole("heading", { level: 1 }).click();
  await page.keyboard.press("ArrowLeft");

  await expect(page.locator(pageStatus)).toHaveText(secondSpread);
});

test("leaves the arrow keys alone once they are disabled", async ({ page }) => {
  await openReader(page, gesturesDemo);
  await setGesture(page, "Arrow keys", false);

  await page.locator(viewport).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");

  await expect(page.locator(toolbar)).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(pageStatus)).toHaveText(firstSpread);
});

test("reveals the controls from an edge once edge clicks are disabled", async ({
  page,
}) => {
  await openReader(page, gesturesDemo);
  await setGesture(page, "Edge click", false);

  await clickViewportAt(page, 0.05);

  await expect(page.locator(toolbar)).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(pageStatus)).toHaveText(firstSpread);

  await setGesture(page, "Edge click", true);
  await clickViewportAt(page, 0.05);

  await expect(page.locator(pageStatus)).toHaveText(secondSpread);
});
