import { expect, test } from "@playwright/test";

import { revealReaderControls } from "#helpers/reader";
import { getSliderGeometry, getSliderX } from "#helpers/reading-progress";
import { progressSlider } from "#helpers/selectors";

test("names the controls and the pages on screen in Japanese", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/recipes/localization");
  await revealReaderControls(page);

  await expect(page.locator(".pcv-page-status")).toHaveText("1〜2 / 21 ページ");

  const slider = page.getByRole("slider", { name: "読書の進み具合" });

  await expect(slider).toHaveAttribute("aria-valuetext", "1〜2 / 21 ページ");

  await page.getByRole("button", { name: "次のページ" }).click();

  await expect(page.locator(".pcv-page-status")).toHaveText("3〜4 / 21 ページ");
  await expect(slider).toHaveAttribute("aria-valuetext", "3〜4 / 21 ページ");
});

test("announces the spread under the thumb in Japanese during a drag", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/recipes/localization");
  await revealReaderControls(page);

  const geometry = await getSliderGeometry(page);

  await page.mouse.move(getSliderX(geometry, 0), geometry.centreY);
  await page.mouse.down();
  await page.mouse.move(getSliderX(geometry, 10.5), geometry.centreY, {
    steps: 10,
  });

  await expect(page.locator(progressSlider)).toHaveAttribute(
    "aria-valuetext",
    "11〜12 / 21 ページ"
  );

  await page.mouse.up();

  await expect(page.locator(".pcv-page-status")).toHaveText(
    "11〜12 / 21 ページ"
  );
});
