import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  expectPageOnHalf,
  openShortenedReader,
  revealReaderControl,
  turnToNextScreen,
} from "#helpers/reader";
import { currentPageSet, pageStatus, viewport } from "#helpers/selectors";

const lastSpread = "Pages 3-4 of 4";
const characterNotes = "Character notes";

const textPagesDemo = "/features/text-pages";

type TouchType = "touchStart" | "touchMove" | "touchEnd";

/**
 * Returns a finger that touches the viewport at `offset` pixels from its
 * centre, through the browser's own input pipeline. Playwright's touchscreen
 * only taps, so a swipe goes through the Chrome DevTools Protocol, which also
 * applies the `touch-action` the reader sets. One session carries the whole
 * swipe, since a touch only moves and ends in the session it started in.
 */
const touchViewport = async (page: Page) => {
  const box = await page.locator(viewport).boundingBox();

  if (box === null) {
    throw new Error("The viewport was not laid out.");
  }

  const session = await page.context().newCDPSession(page);

  return async (type: TouchType, offset = 0) => {
    await session.send("Input.dispatchTouchEvent", {
      touchPoints:
        type === "touchEnd"
          ? []
          : [{ x: box.x + box.width / 2 + offset, y: box.y + box.height / 2 }],
      type,
    });
  };
};

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

  await openShortenedReader(page, textPagesDemo);

  const textPages = page.locator(`${currentPageSet} article`);

  await expect(textPages).toHaveCount(2);
  await expect(textPages.first()).toHaveAccessibleName("Afterword, page 1");
  await expect(textPages.last()).toHaveAccessibleName("Afterword, page 2");
  await expect(page.locator(`${currentPageSet} canvas`)).toHaveCount(0);
  // The pages meet at the gutter as image pages do.
  await expectPageOnHalf(page, textPages.first(), "left");
  await expectPageOnHalf(page, textPages.last(), "right");

  await turnToNextScreen(page, lastSpread);
  await expect(textPages.first()).toHaveAccessibleName(characterNotes);
  await expect(textPages.last()).toHaveAccessibleName("Credits");
  expect(imageRequests).toEqual([]);
});

test("shows one text page at a time on a phone", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(textPagesDemo);

  await expect(page.locator(pageStatus)).toHaveText("Page 1 of 4");
  await expect(page.locator(`${currentPageSet} article`)).toHaveAccessibleName(
    "Afterword, page 1"
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test("slides the text pages onto the next spread", async ({ page }) => {
  await openShortenedReader(page, textPagesDemo);

  // The rail holds the next spread beside the one on screen, as it does for
  // image pages.
  await expect(
    page.locator('.pcv-viewport-page-set[data-rail-slot="next"] article')
  ).toHaveCount(2);

  const nextPageButton = await revealReaderControl(page, "Next page");

  // The track is sampled on every frame of the turn: a slide passes through
  // positions between the two spreads, where a jump would show none.
  const trackPositions = page.locator(viewport).evaluate(
    (element) =>
      // oxlint-disable-next-line promise/avoid-new -- The frames are sampled until the turn is over.
      new Promise<number[]>((resolve) => {
        const track = element.querySelector(".pcv-viewport-track");
        const positions: number[] = [];
        const startedAt = performance.now();
        let hasTurned = false;

        const sample = () => {
          if (track !== null) {
            positions.push(
              new DOMMatrix(getComputedStyle(track).transform).m41
            );
          }

          const state = element.dataset.transitionState;
          hasTurned ||= state === "active";

          if (
            (hasTurned && state === "idle") ||
            performance.now() - startedAt > 3000
          ) {
            resolve(positions);
          } else {
            requestAnimationFrame(sample);
          }
        };

        requestAnimationFrame(sample);
      })
  );

  await nextPageButton.click();
  await expect(page.locator(pageStatus)).toHaveText(lastSpread);

  const positions = await trackPositions;
  const [restingPosition] = positions;
  const settledPosition = positions.at(-1) ?? restingPosition;

  // The track comes back to rest once the turn is over, so the positions
  // between the two ends are the ones a slide passes through.
  const travelledPositions = positions.filter(
    (position) =>
      Math.abs(position - restingPosition) > 1 &&
      Math.abs(position - settledPosition) > 1
  );

  expect(travelledPositions.length).toBeGreaterThan(1);
  await expect(
    page.locator(`${currentPageSet} article`).first()
  ).toHaveAccessibleName(characterNotes);
});

test.describe("on a touchscreen", () => {
  test.use({ hasTouch: true });

  test("lets a text page follow the finger during a swipe", async ({
    page,
  }) => {
    await openShortenedReader(page, textPagesDemo);

    const firstPage = page.locator(`${currentPageSet} article`).first();
    const restingBox = await firstPage.boundingBox();

    const touch = await touchViewport(page);

    await touch("touchStart");
    await touch("touchMove", -240);

    await expect(page.locator(viewport)).toHaveAttribute(
      "data-dragging",
      "true"
    );
    const draggedBox = await firstPage.boundingBox();

    if (restingBox === null || draggedBox === null) {
      throw new Error("The text page was not laid out.");
    }

    expect(draggedBox.x - restingBox.x).toBeCloseTo(-240, 0);

    await touch("touchEnd");

    await expect(page.locator(pageStatus)).toHaveText(lastSpread);
    await expect(firstPage).toHaveAccessibleName(characterNotes);
  });
});
