import { expect, test } from "@playwright/test";

import {
  expectPageOnHalf,
  openShortenedReader,
  turnToNextScreen,
} from "#helpers/reader";
import { currentPageSet } from "#helpers/selectors";

test("draws pages without an image and loads none", async ({ page }) => {
  const imageRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.resourceType() === "image" ||
      request.url().includes("/pages/")
    ) {
      imageRequests.push(request.url());
    }
  });

  await openShortenedReader(page, "/features/text-pages");

  const textPages = page.locator(`${currentPageSet} article`);

  await expect(textPages).toHaveCount(2);
  await expect(textPages.first()).toHaveAccessibleName("Afterword, page 1");
  await expect(textPages.last()).toHaveAccessibleName("Afterword, page 2");
  await expect(page.locator(`${currentPageSet} canvas`)).toHaveCount(0);
  // The pages meet at the gutter as image pages do.
  await expectPageOnHalf(page, textPages.first(), "left");
  await expectPageOnHalf(page, textPages.last(), "right");

  await turnToNextScreen(page, "Pages 3-4 of 4");
  await expect(textPages.first()).toHaveAccessibleName("Character notes");
  await expect(textPages.last()).toHaveAccessibleName("Credits");
  expect(imageRequests).toEqual([]);
});

test("shows one text page at a time on a phone", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/features/text-pages");

  await expect(page.locator(".pcv-page-status")).toHaveText("Page 1 of 4");
  await expect(page.locator(`${currentPageSet} article`)).toHaveAccessibleName(
    "Afterword, page 1"
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});
