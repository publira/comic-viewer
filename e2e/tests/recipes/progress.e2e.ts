import { expect, test } from "@playwright/test";

import { turnThroughScreens } from "#helpers/reader";
import { currentPageSet } from "#helpers/selectors";

test("restores the stored reading position after a reload", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/recipes/progress");

  const savedPosition = page.getByRole("status", { name: "Saved position" });
  const startOverButton = page.getByRole("button", { name: "Start over" });

  await expect(
    page.getByRole("heading", { name: "Remember the reading position" })
  ).toBeVisible();
  // Nothing has been stored for this document yet, so the demo opens on the
  // first page with nothing to start over from.
  await expect(savedPosition).toHaveText("Not saved yet");
  await expect(startOverButton).toBeDisabled();
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 21");

  await turnThroughScreens(page, ["Pages 3-4 of 21", "Pages 5-6 of 21"]);

  await expect(savedPosition).toHaveText("Page 5");

  await page.reload();

  // The position is read back before the reader mounts, so it opens on the
  // stored spread rather than opening on the first page and turning away.
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 5-6 of 21");
  await expect(savedPosition).toHaveText("Page 5");
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 5"]`)
  ).toHaveAttribute("data-page-status", "loaded");

  await startOverButton.click();

  // The index is controlled, so clearing the stored position also returns the
  // reader to the first page, and leaves nothing behind for the next visit.
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 21");
  await expect(savedPosition).toHaveText("Not saved yet");

  await page.reload();

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 21");
  await expect(savedPosition).toHaveText("Not saved yet");
});
