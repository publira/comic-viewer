import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { currentPageSet, toolbar, viewport } from "#helpers/selectors";

/**
 * Opens one of the demo readers at its own size. Both demos size a reader to
 * the aspect ratio of a full spread, so a page that is a whole spread fills
 * the page set exactly rather than resting inside it.
 */
export const openReader = async (page: Page, path: string) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(path);

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "double"
  );
};

/**
 * Opens one of the demo readers, shortened. Both demos size a reader to the
 * aspect ratio of a full spread, so its pages fill their halves exactly. A
 * shorter reader is wider than its pages are, which is what leaves the half a
 * page takes visible in its box.
 */
export const openShortenedReader = async (page: Page, path: string) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(path);
  await page.addStyleTag({
    content: ".pcv-root { height: 420px !important; }",
  });

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "double"
  );
};

/**
 * Reveals the reader controls and leaves the pointer resting on them, which
 * holds them open so that the rest of a test is not racing the countdown.
 */
export const revealReaderControls = async (page: Page) => {
  await page.locator(viewport).click();
  await expect(page.locator(toolbar)).toHaveAttribute("aria-hidden", "false");

  const toolbarBox = await page.locator(toolbar).boundingBox();

  if (toolbarBox === null) {
    throw new Error("The reader controls were not laid out.");
  }

  await page.mouse.move(
    toolbarBox.x + toolbarBox.width / 2,
    toolbarBox.y + toolbarBox.height / 2
  );
};

/**
 * Returns a control of the toggle demo, tapping the page first while the
 * reader controls are still hidden. A hidden control is out of the
 * accessibility tree, so the role locator resolves to nothing until then.
 * The pointer is left resting on the toolbar, which holds the controls open
 * for the rest of the test instead of letting the countdown hide them
 * between one assertion and the next.
 */
export const revealReaderControl = async (page: Page, name: string) => {
  const control = page.getByRole("button", { name });

  if (!(await control.isVisible())) {
    await page.locator(viewport).click();
  }

  await expect(control).toBeVisible();
  // A disabled button reports no pointer events of its own, so the hold comes
  // from resting the pointer on the toolbar that holds it.
  await page.locator(".pcv-toolbar").hover();

  return control;
};

/** Turns to the next screen through the reader controls. */
export const turnToNextScreen = async (page: Page, pageStatus: string) => {
  const nextPageButton = page.getByRole("button", { name: "Next page" });

  // The controls stay hidden until the reader is tapped, and a pointer resting
  // on a control holds them open, so one tap carries a whole run of turns.
  if (!(await nextPageButton.isVisible())) {
    await page.locator(viewport).click();
  }

  await nextPageButton.click();
  await expect(page.locator(".pcv-page-status")).toHaveText(pageStatus);
};

/** Turns through a run of screens, checking the status each turn lands on. */
export const turnThroughScreens = async (
  page: Page,
  pageStatuses: string[]
) => {
  for (const pageStatus of pageStatuses) {
    // oxlint-disable-next-line no-await-in-loop -- A page turn starts from the screen the previous one landed on.
    await turnToNextScreen(page, pageStatus);
  }
};

/** Asserts that a page fills its half of the spread up to the centre line. */
export const expectPageOnHalf = async (
  page: Page,
  pageCanvas: Locator,
  side: "left" | "right"
) => {
  const pageSetBox = await page.locator(currentPageSet).boundingBox();
  const pageBox = await pageCanvas.boundingBox();

  if (pageSetBox === null || pageBox === null) {
    throw new Error("The current spread was not laid out.");
  }

  const centreLine = pageSetBox.x + pageSetBox.width / 2;

  // The page is narrower than the half it occupies, so it only reaches the
  // centre line while it sits on the expected half, against the gutter. The
  // side attribute alone would pass even while a stylesheet ignored it.
  expect(pageBox.width).toBeLessThan(pageSetBox.width / 2);

  if (side === "left") {
    expect(pageBox.x + pageBox.width).toBeCloseTo(centreLine, 0);
  } else {
    expect(pageBox.x).toBeCloseTo(centreLine, 0);
  }
};
