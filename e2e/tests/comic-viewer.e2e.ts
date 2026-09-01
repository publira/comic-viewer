import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const viewport = ".pcv-viewport";
const viewportTrack = ".pcv-viewport-track";
const currentPageSet = '.pcv-viewport-page-set[data-rail-slot="current"]';

test("renders the basic reader and navigates through a double-page spread", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Basic image loading" })
  ).toBeVisible();
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "double"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 21");

  await page.locator(viewport).click({ position: { x: 640, y: 300 } });
  await page.getByRole("button", { name: "Next page" }).click();

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 21");
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(page.locator(viewportTrack)).toHaveCSS(
    "transition-duration",
    "0s"
  );
});

test("uses a single page at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await page.goto("/");

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  await expect(page.locator(".pcv-page-status")).toHaveText("Page 1 of 21");
});

test("decrypts and renders encrypted pages", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/plugins/decrypted");

  await expect(
    page.getByRole("heading", { name: "Decrypted plugin sample" })
  ).toBeVisible();
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`)
  ).toHaveAttribute("data-page-status", "loaded");
});

test("applies the watermark plugin before rendering a page", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/plugins/watermark");

  await expect(
    page.getByRole("heading", { name: "Text watermark plugin sample" })
  ).toBeVisible();
  const canvas = page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`);
  await expect(canvas).toHaveAttribute("data-page-status", "loaded");
});

test("keeps the two pages of a spread meeting at the gutter", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");

  // Both demos size the viewer to the aspect ratio of a full spread, so the
  // pages fill it exactly. Shortening the viewer makes it wider than the pages
  // are, which is where the halves of a spread used to drift apart.
  await page.addStyleTag({
    content: ".pcv-root { height: 420px !important; }",
  });

  const pageCanvases = page.locator(`${currentPageSet} canvas`);
  await expect(pageCanvases).toHaveCount(2);
  await expect(pageCanvases.first()).toHaveAttribute(
    "data-page-status",
    "loaded"
  );
  await expect(pageCanvases.last()).toHaveAttribute(
    "data-page-status",
    "loaded"
  );

  const pageSetBox = await page.locator(currentPageSet).boundingBox();
  const leftPageBox = await pageCanvases.first().boundingBox();
  const rightPageBox = await pageCanvases.last().boundingBox();

  if (pageSetBox === null || leftPageBox === null || rightPageBox === null) {
    throw new Error("The current spread was not laid out.");
  }

  // The pages are narrower than the halves they occupy, so this only holds
  // once each page is aligned against the centre line.
  expect(leftPageBox.width).toBeLessThan(pageSetBox.width / 2);
  expect(leftPageBox.x + leftPageBox.width).toBeCloseTo(rightPageBox.x, 0);
  expect(rightPageBox.x).toBeCloseTo(pageSetBox.x + pageSetBox.width / 2, 0);
});

/**
 * Opens one of the demo readers, shortened. Both demos size a reader to the
 * aspect ratio of a full spread, so its pages fill their halves exactly. A
 * shorter reader is wider than its pages are, which is what leaves the half a
 * page takes visible in its box.
 */
const openShortenedReader = async (page: Page, path: string) => {
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

/** Turns to the next screen through the reader controls. */
const turnToNextScreen = async (page: Page, pageStatus: string) => {
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
const turnThroughScreens = async (page: Page, pageStatuses: string[]) => {
  for (const pageStatus of pageStatuses) {
    // oxlint-disable-next-line no-await-in-loop -- A page turn starts from the screen the previous one landed on.
    await turnToNextScreen(page, pageStatus);
  }
};

/** Asserts that a page fills its half of the spread up to the centre line. */
const expectPageOnHalf = async (
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

test("places the page before the spread start on the half it faces from", async ({
  page,
}) => {
  await openShortenedReader(page, "/spreads");

  const coverCanvas = page.locator(`${currentPageSet} canvas`);

  // Reading right to left, the cover faces the page that follows it from the
  // left half, the one the next spread leaves free.
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-side",
    "left"
  );
  await expect(coverCanvas).toHaveAttribute("aria-label", "Page 1");
  await expectPageOnHalf(page, coverCanvas, "left");
});

test("opens the first spread after the spread start", async ({ page }) => {
  await openShortenedReader(page, "/spreads");
  await turnToNextScreen(page, "Pages 2-3 of 8");

  const pageCanvases = page.locator(`${currentPageSet} canvas`);

  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(pageCanvases).toHaveCount(2);
  // The spread starts on the right half, so the earlier page takes it and the
  // page facing it takes the left.
  await expect(pageCanvases.first()).toHaveAttribute("aria-label", "Page 3");
  await expect(pageCanvases.last()).toHaveAttribute("aria-label", "Page 2");
  await expectPageOnHalf(page, pageCanvases.first(), "left");
  await expectPageOnHalf(page, pageCanvases.last(), "right");
});

test("keeps the unpaired last page on the side a spread starts on", async ({
  page,
}) => {
  await openShortenedReader(page, "/spreads");

  await turnThroughScreens(page, [
    "Pages 2-3 of 8",
    "Pages 4-5 of 8",
    "Pages 6-7 of 8",
    "Page 8 of 8",
  ]);

  const lastPageCanvas = page.locator(`${currentPageSet} canvas`);

  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-side",
    "right"
  );
  await expect(lastPageCanvas).toHaveAttribute("aria-label", "Page 8");
  await expectPageOnHalf(page, lastPageCanvas, "right");
});

test("opens a left-to-right spread in reading order", async ({ page }) => {
  await openShortenedReader(page, "/ltr");

  const pageCanvases = page.locator(`${currentPageSet} canvas`);

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-reading-direction",
    "ltr"
  );
  await expect(pageCanvases).toHaveCount(2);
  await expect(pageCanvases.first()).toHaveAttribute("aria-label", "Page 1");
  await expect(pageCanvases.last()).toHaveAttribute("aria-label", "Page 2");
  await expectPageOnHalf(page, pageCanvases.first(), "left");
  await expectPageOnHalf(page, pageCanvases.last(), "right");
});

test("keeps the unpaired last page of a left-to-right reader on the left", async ({
  page,
}) => {
  await openShortenedReader(page, "/ltr");

  const spreadStatuses = [3, 5, 7, 9, 11, 13, 15, 17, 19].map(
    (firstPage) => `Pages ${firstPage}-${firstPage + 1} of 21`
  );

  await turnThroughScreens(page, [...spreadStatuses, "Page 21 of 21"]);

  const lastPageCanvas = page.locator(`${currentPageSet} canvas`);

  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-side",
    "left"
  );
  await expect(lastPageCanvas).toHaveAttribute("aria-label", "Page 21");
  await expectPageOnHalf(page, lastPageCanvas, "left");
});

test("keeps the reading position across a fullscreen round trip", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/fullscreen");

  const enterFullscreenButton = page.getByRole("button", {
    name: "Enter full screen",
  });
  const exitFullscreenButton = page.getByRole("button", {
    name: "Exit full screen",
  });

  // The control is disabled where the browser refuses fullscreen outright, so
  // this also pins down that the demo reports the API as available.
  await expect(enterFullscreenButton).toBeEnabled();

  await turnToNextScreen(page, "Pages 3-4 of 21");

  const boxedReaderBox = await page.locator(".pcv-root").boundingBox();

  if (boxedReaderBox === null) {
    throw new Error("The reader was not laid out.");
  }

  await enterFullscreenButton.click();

  // The label follows the fullscreenchange event rather than the call, so it
  // only flips once the container really is the element filling the screen.
  await expect(exitFullscreenButton).toBeVisible();
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 21");
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "double"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(
    page.locator(`${currentPageSet} canvas`).first()
  ).toHaveAttribute("data-page-status", "loaded");

  // The screen sizes a fullscreen element, so the reader leaves the box the
  // page keeps it in. Nothing tells the viewer about that: it measures its own
  // container, which is what has to carry the layout across.
  const fullscreenReaderBox = await page.locator(".pcv-root").boundingBox();

  if (fullscreenReaderBox === null) {
    throw new Error("The fullscreen reader was not laid out.");
  }

  expect(fullscreenReaderBox.height).toBeGreaterThan(boxedReaderBox.height);

  await exitFullscreenButton.click();

  await expect(enterFullscreenButton).toBeVisible();
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 21");
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "double"
  );
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect
    .poll(async () => {
      const restoredReaderBox = await page.locator(".pcv-root").boundingBox();

      return restoredReaderBox?.height;
    })
    .toBeCloseTo(boxedReaderBox.height, 0);
});
