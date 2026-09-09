import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const viewport = ".pcv-viewport";
const viewportTrack = ".pcv-viewport-track";
const currentPageSet = '.pcv-viewport-page-set[data-rail-slot="current"]';
const startSlotPage = '.pcv-page-slot[data-page-slot="start"]';
const endSlotPage = '.pcv-page-slot[data-page-slot="end"]';
const toolbar = ".pcv-toolbar";
const progressSlider = ".pcv-page-progress-slider";
/** The width both demos give the thumb of the reading-progress slider. */
const SLIDER_THUMB_WIDTH = 14;

/**
 * Reveals the reader controls and leaves the pointer resting on them, which
 * holds them open so that the rest of a test is not racing the countdown.
 */
const revealReaderControls = async (page: Page) => {
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

interface SliderGeometry {
  centreY: number;
  isRightToLeft: boolean;
  max: number;
  min: number;
  trackStart: number;
  trackWidth: number;
}

const getSliderGeometry = async (page: Page): Promise<SliderGeometry> => {
  const slider = page.locator(progressSlider);
  const sliderBox = await slider.boundingBox();

  if (sliderBox === null) {
    throw new Error("The reading progress was not laid out.");
  }

  return {
    centreY: sliderBox.y + sliderBox.height / 2,
    isRightToLeft: (await page.locator(toolbar).getAttribute("dir")) === "rtl",
    max: Number(await slider.getAttribute("max")),
    min: Number(await slider.getAttribute("min")),
    // The thumb travels between its own two halves, so the values the slider
    // reports are spread over the track those halves leave inside its box.
    trackStart: sliderBox.x + SLIDER_THUMB_WIDTH / 2,
    trackWidth: sliderBox.width - SLIDER_THUMB_WIDTH,
  };
};

/** The x coordinate the slider puts a navigable index at. */
const getSliderX = (geometry: SliderGeometry, index: number): number => {
  const ratio = (index - geometry.min) / (geometry.max - geometry.min);

  return (
    geometry.trackStart +
    (geometry.isRightToLeft ? 1 - ratio : ratio) * geometry.trackWidth
  );
};

/** Presses the thumb where it rests and drags it to an x coordinate. */
const dragSliderThumbToX = async (
  page: Page,
  geometry: SliderGeometry,
  x: number
) => {
  const value = Number(await page.locator(progressSlider).inputValue());

  await page.mouse.move(getSliderX(geometry, value), geometry.centreY);
  await page.mouse.down();
  await page.mouse.move(x, geometry.centreY, { steps: 10 });
  await page.mouse.up();
};

/** Drags the reading-progress thumb to a navigable index. */
const dragSliderThumbTo = async (page: Page, index: number) => {
  const geometry = await getSliderGeometry(page);

  await dragSliderThumbToX(page, geometry, getSliderX(geometry, index));
};

/** Drags the reading-progress thumb to a share of the track from its left. */
const dragSliderThumbToFraction = async (page: Page, fraction: number) => {
  const geometry = await getSliderGeometry(page);

  await dragSliderThumbToX(
    page,
    geometry,
    geometry.trackStart + fraction * geometry.trackWidth
  );
};

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

test("restores the stored reading position after a reload", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/progress");

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

test("counts the whole document while its page metadata resolves", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/lazy");

  await expect(
    page.getByRole("heading", { name: "Lazy page metadata" })
  ).toBeVisible();

  // Navigation counts the pages the document holds, not the ones resolved so
  // far, so the status is right before any metadata has arrived.
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 7");
  // The pages of the spread keep their places while their metadata is on its
  // way, rather than leaving the spread to collapse.
  await expect(page.locator(`${currentPageSet} .pcv-page-pending`)).toHaveCount(
    2
  );

  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`)
  ).toHaveAttribute("data-page-status", "loaded");
  await expect(page.locator(`${currentPageSet} .pcv-page-pending`)).toHaveCount(
    0
  );
  // Four pages on either side of the current one, and no more, are asked for.
  await expect(
    page.getByRole("status", { name: "Metadata requests" })
  ).toHaveText("5");
});

test("appends the next chapter as the reader reaches the end of the loaded pages", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/lazy");

  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`)
  ).toHaveAttribute("data-page-status", "loaded");
  await expect(
    page.getByRole("status", { name: "Pages available" })
  ).toHaveText("7 of 21");

  await turnToNextScreen(page, "Pages 3-4 of 7");
  // Two pages from the end of the loaded chapter, the next one is appended,
  // and the reader keeps its place while the document grows around it.
  await turnToNextScreen(page, "Pages 5-6 of 14");

  await expect(
    page.getByRole("status", { name: "Pages available" })
  ).toHaveText("14 of 21");
  await expect(
    page.getByRole("status", { name: "Chapters loaded" })
  ).toHaveText("2 of 3");
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 5"]`)
  ).toHaveAttribute("data-page-status", "loaded");
});

test("turns through the start pages without counting them as pages", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/slots");

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
  await page.goto("/slots");

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

/**
 * Returns a control of the toggle demo, tapping the page first while the
 * reader controls are still hidden. A hidden control is out of the
 * accessibility tree, so the role locator resolves to nothing until then.
 * The pointer is left resting on the toolbar, which holds the controls open
 * for the rest of the test instead of letting the countdown hide them
 * between one assertion and the next.
 */
const revealReaderControl = async (page: Page, name: string) => {
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

test("switches the view mode from the toolbar toggle", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/controls");

  const viewModeToggle = await revealReaderControl(page, "Double-page view");

  await expect(viewModeToggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 21");

  await viewModeToggle.click();

  await expect(viewModeToggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );
  await expect(page.locator(".pcv-page-status")).toHaveText("Page 1 of 21");
});

test("disables the view-mode toggle on a viewport too narrow for a spread", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await page.goto("/controls");

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-view-mode",
    "single"
  );
  await expect(
    await revealReaderControl(page, "Double-page view")
  ).toBeDisabled();
});

test("switches the reading direction and the page fit from the toolbar", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/controls");

  const directionToggle = await revealReaderControl(
    page,
    "Reading direction: Right to left"
  );
  await directionToggle.click();

  await expect(page.locator(viewport)).toHaveAttribute(
    "data-reading-direction",
    "ltr"
  );
  // The toggle names the direction it is on, so it answers to the other name
  // once the reader has turned around.
  await expect(
    page.getByRole("button", { name: "Reading direction: Left to right" })
  ).toHaveAttribute("data-reading-direction", "ltr");

  const fitToHeight = await revealReaderControl(page, "Fit to height");
  const fitToWidth = await revealReaderControl(page, "Fit to width");

  await expect(fitToHeight).toHaveAttribute("aria-pressed", "true");

  await fitToWidth.click();

  await expect(fitToWidth).toHaveAttribute("aria-pressed", "true");
  await expect(fitToHeight).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(viewport)).toHaveAttribute(
    "data-page-fit-mode",
    "width"
  );
});

test("leaves a control on a slot page out of the page-turn edge", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 600 });
  await page.goto("/slots");

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

test("scrubs to a page by dragging the reading-progress thumb", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");
  await revealReaderControls(page);

  const geometry = await getSliderGeometry(page);

  await page.mouse.move(getSliderX(geometry, 0), geometry.centreY);
  await page.mouse.down();
  await page.mouse.move(getSliderX(geometry, 10), geometry.centreY, {
    steps: 10,
  });

  // The status follows the thumb, while the document waits for the drag to be
  // released rather than turning at every index the thumb passes over.
  await expect(page.locator(".pcv-page-status")).toHaveText(
    "Pages 11-12 of 21"
  );
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 1"]`)
  ).toBeVisible();

  await page.mouse.up();

  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 11"]`)
  ).toBeVisible();
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 12"]`)
  ).toBeVisible();
  await expect(page.locator(".pcv-page-status")).toHaveText(
    "Pages 11-12 of 21"
  );
});

test("steps through the document with the arrow keys on the reading progress", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/ltr");
  await revealReaderControls(page);
  await page.locator(progressSlider).focus();

  // One step of a range input is one index, which in double-page mode falls on
  // the facing page of the spread the reader is already on, so the key moves
  // on to the spread it was heading for.
  await page.keyboard.press("ArrowRight");

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 21");
  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 3"]`)
  ).toBeVisible();

  await page.keyboard.press("ArrowLeft");

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 1-2 of 21");

  await page.keyboard.press("End");

  // The last page of an odd document has no page to face, and the slider ends
  // on it as the page-turn controls do.
  await expect(page.locator(".pcv-page-status")).toHaveText("Page 21 of 21");
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "1"
  );
});

test("snaps a scrub to the page a spread starts from", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/spreads");
  await revealReaderControls(page);

  await expect(page.locator(".pcv-page-status")).toHaveText("Page 1 of 8");

  await dragSliderThumbTo(page, 4);

  // The spreads of this document are counted from the second page, so index 4
  // is the facing page of the spread that opens at index 3, and a spread is
  // addressed by the page it starts from.
  await expect(page.locator(progressSlider)).toHaveValue("3");
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 4-5 of 8");
  await expect(page.locator(currentPageSet)).toHaveAttribute(
    "data-page-count",
    "2"
  );
});

test("runs the reading progress the way the reader turns pages", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");
  await revealReaderControls(page);

  // A quarter of the way in from the left edge is three quarters of the way
  // through a document read from right to left.
  await dragSliderThumbToFraction(page, 0.25);

  await expect(page.locator(".pcv-page-status")).toHaveText(
    "Pages 15-16 of 21"
  );

  await page.goto("/ltr");
  await revealReaderControls(page);
  await dragSliderThumbToFraction(page, 0.25);

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 5-6 of 21");
});

test("keeps the reader controls up for the length of a scrub", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");
  await revealReaderControls(page);

  const geometry = await getSliderGeometry(page);

  await page.mouse.move(getSliderX(geometry, 0), geometry.centreY);
  await page.mouse.down();
  // A finger that drags past the edge of the toolbar leaves it, which is what
  // used to let the controls hide and turn inert underneath it.
  await page.mouse.move(getSliderX(geometry, 6), geometry.centreY - 300, {
    steps: 10,
  });
  await page.waitForTimeout(2500);

  await expect(page.locator(toolbar)).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 7-8 of 21");

  await page.mouse.up();

  await expect(
    page.locator(`${currentPageSet} canvas[aria-label="Page 7"]`)
  ).toBeVisible();

  // A captured pointer reports no boundary event, so the toolbar only learns
  // that the pointer has left it once the released one moves again, and the
  // slider holds the controls open through its focus for as long as it keeps
  // it. The drag holds the controls on top of both, and this is what shows
  // that its own hold ended with it rather than outlasting it.
  await page.mouse.move(getSliderX(geometry, 6) - 20, geometry.centreY - 300);
  await page.locator(progressSlider).blur();

  await expect(page.locator(toolbar)).toHaveAttribute("aria-hidden", "true");
});

/** The demo each project's header links across to, keyed by project name. */
const counterpartDemos = {
  "default-css": {
    heading: "Comic Viewer Tailwind CSS Demo",
    link: "Tailwind CSS demo",
  },
  "tailwind-css": {
    heading: "Comic Viewer Demo",
    link: "Default stylesheet demo",
  },
} as const;

test("crosses over to the same page of the counterpart demo", async ({
  page,
}, testInfo) => {
  const counterpart =
    counterpartDemos[testInfo.project.name as keyof typeof counterpartDemos];

  await page.goto("/spreads");
  await page.getByRole("link", { name: counterpart.link }).click();

  await expect(page).toHaveURL(/\/spreads$/u);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    counterpart.heading
  );
});

/**
 * Pinches the current spread, from two touches `startSpread` apart to two
 * `endSpread` apart. Desktop Chrome has no pinch of its own, so the gesture is
 * dispatched as the touch events the viewport listens for.
 */
const pinchViewport = async (
  page: Page,
  startSpread: number,
  endSpread: number
) => {
  await page.locator(viewport).evaluate(
    (element, [start, end]) => {
      const box = element.getBoundingClientRect();
      const centreX = box.x + box.width / 2;
      const centreY = box.y + box.height / 2;
      const touchesAt = (spread: number) =>
        [-spread / 2, spread / 2].map(
          (offset, index) =>
            new Touch({
              clientX: centreX + offset,
              clientY: centreY,
              identifier: index,
              target: element,
            })
        );
      const dispatch = (type: string, touches: Touch[]) => {
        element.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            changedTouches: touches,
            targetTouches: touches,
            touches,
          })
        );
      };

      dispatch("touchstart", touchesAt(start));
      dispatch("touchmove", touchesAt(end));
      dispatch("touchend", []);
    },
    [startSpread, endSpread] as const
  );
};

test("reports the pinch scale through the viewer context", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/zoom");

  const resetZoomButton = await revealReaderControl(page, "Reset zoom");
  const zoomScale = page.getByRole("status", { name: "Zoom scale" });

  await expect(zoomScale).toHaveText("100%");
  await expect(resetZoomButton).toBeDisabled();

  await pinchViewport(page, 100, 200);

  await expect(zoomScale).toHaveText("200%");
  await expect(page.locator(viewport)).toHaveAttribute("data-pannable", "true");
});

test("returns a pinched spread to its fit mode from the context reset", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/zoom");

  const resetZoomButton = await revealReaderControl(page, "Reset zoom");

  await pinchViewport(page, 100, 200);
  await expect(resetZoomButton).toBeEnabled();

  await resetZoomButton.click();

  await expect(page.getByRole("status", { name: "Zoom scale" })).toHaveText(
    "100%"
  );
  await expect(page.locator(viewport)).not.toHaveAttribute("data-pannable");
});

test("drops the zoom scale of the spread the reader turns away from", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/zoom");

  await revealReaderControl(page, "Reset zoom");
  await pinchViewport(page, 100, 200);

  const zoomScale = page.getByRole("status", { name: "Zoom scale" });

  await expect(zoomScale).toHaveText("200%");

  await page.getByRole("button", { name: "Next page" }).click();

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 21");
  await expect(zoomScale).toHaveText("100%");
});
