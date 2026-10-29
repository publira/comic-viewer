import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

import { revealReaderControls } from "#helpers/reader";
import { getSliderGeometry, getSliderX } from "#helpers/reading-progress";
import { pageStatus, progressSlider } from "#helpers/selectors";

/** Expects the slider to name the pages under its thumb as `text`. */
const expectValueText = async (slider: Locator, text: string) => {
  await expect(slider).toHaveAttribute("aria-valuetext", text);
};

test("names the controls and the pages on screen in Japanese", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/recipes/localization");
  await revealReaderControls(page);

  await expect(page.locator(pageStatus)).toHaveText("1〜2 / 21 ページ");
  await expect(page.getByRole("region", { name: "漫画のページ" })).toHaveClass(
    /pcv-viewport/u
  );

  const slider = page.getByRole("slider", { name: "読書の進み具合" });

  await expectValueText(slider, "1〜2 / 21 ページ");

  await page.getByRole("button", { name: "次のページ" }).click();

  await expect(page.locator(pageStatus)).toHaveText("3〜4 / 21 ページ");
  await expectValueText(slider, "3〜4 / 21 ページ");
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

  await expectValueText(page.locator(progressSlider), "11〜12 / 21 ページ");

  await page.mouse.up();

  await expect(page.locator(pageStatus)).toHaveText("11〜12 / 21 ページ");
});
