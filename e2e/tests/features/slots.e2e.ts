import { expect, test } from "@playwright/test";

import { turnThroughScreens, turnToNextScreen } from "#helpers/reader";
import {
  currentPageSet,
  endSlotPage,
  startSlotPage,
  viewport,
} from "#helpers/selectors";

test("turns through the start pages without counting them as pages", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/features/slots");

  await expect(
    page.getByRole("heading", { name: "Pages around the chapter" })
  ).toBeVisible();
  // The demo counts the spreads from the first start page, so the two of them
  // open the reader facing each other.
  await expect(page.locator(`${currentPageSet} ${startSlotPage}`)).toHaveCount(
    2
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(
    page.locator(`${currentPageSet} ${startSlotPage}[data-slot-page="2"]`)
  ).toBeVisible();
  // An extra page is turned to like any other, yet the numbering the reader
  // sees stays the numbering of the document, so the status names the places
  // they take in their slot rather than giving them page numbers.
  await expect(page.locator(".pcv-page-status")).toHaveText(
    "Start pages 1-2 of 2"
  );

  await turnToNextScreen(page, "Pages 1-2 of 7");
  await expect(page.locator(`${currentPageSet} ${startSlotPage}`)).toHaveCount(
    0
  );
});

test("pairs the first end page with the last page of an odd chapter", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/features/slots");

  await turnThroughScreens(page, [
    "Pages 1-2 of 7",
    "Pages 3-4 of 7",
    "Pages 5-6 of 7",
    "Page 7 of 7",
  ]);

  // The last page has no facing page of its own, so the first end page takes
  // the half of the spread next to it without being counted in the status.
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(page.locator(`${currentPageSet} ${endSlotPage}`)).toBeVisible();
  await expect(page.locator(`${currentPageSet} canvas`)).toHaveAttribute(
    "aria-label",
    "Page 7"
  );

  // The end page that follows opens a spread of its own, and is the last
  // screen the reader can reach.
  await turnToNextScreen(page, "End page 2 of 2");
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  await expect(
    page.locator(`${currentPageSet} ${endSlotPage}`)
  ).toHaveAttribute("data-slot-page", "2");
  await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
});

test("leaves a control on a slot page out of the page-turn edge", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await page.goto("/features/slots");

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );
  await expect(page.locator(".pcv-page-status")).toHaveText(
    "Start page 1 of 2"
  );

  const startPage = page.locator(`${currentPageSet} ${startSlotPage}`);

  // The disclosure starts inside the edge of the viewport that turns the page,
  // so the click reaches it only while a control keeps the gesture to itself.
  await startPage
    .getByText("Why am I seeing this?")
    .click({ position: { x: 4, y: 4 } });

  await expect(startPage.getByText("Early access comes with")).toBeVisible();
  await expect(page.locator(".pcv-page-status")).toHaveText(
    "Start page 1 of 2"
  );
});
