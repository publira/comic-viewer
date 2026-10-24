import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  expectPageOnHalf,
  openShortenedReader,
  revealReaderControl,
  turnToNextScreen,
} from "#helpers/reader";
import { currentPageSet, viewport } from "#helpers/selectors";

/**
 * Dispatches a one-finger touch on the viewport, at `offset` pixels from its
 * centre. Desktop Chrome has no touchscreen, so the swipe is dispatched as the
 * touch events the viewport listens for.
 */
const touchViewport = async (page: Page, type: string, offset = 0) => {
  await page.locator(viewport).evaluate(
    (element, [eventType, touchOffset]) => {
      const box = element.getBoundingClientRect();
      const touches =
        eventType === "touchend"
          ? []
          : [
              new Touch({
                clientX: box.x + box.width / 2 + touchOffset,
                clientY: box.y + box.height / 2,
                identifier: 0,
                target: element,
              }),
            ];

      element.dispatchEvent(
        new TouchEvent(eventType, {
          bubbles: true,
          cancelable: true,
          changedTouches: touches,
          targetTouches: touches,
          touches,
        })
      );
    },
    [type, offset] as const
  );
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

test("slides the text pages onto the next spread", async ({ page }) => {
  await openShortenedReader(page, "/features/text-pages");

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
  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 4");

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
  ).toHaveAccessibleName("Character notes");
});

test("lets a text page follow the finger during a swipe", async ({ page }) => {
  await openShortenedReader(page, "/features/text-pages");

  const firstPage = page.locator(`${currentPageSet} article`).first();
  const restingBox = await firstPage.boundingBox();

  await touchViewport(page, "touchstart");
  await touchViewport(page, "touchmove", -240);

  await expect(page.locator(viewport)).toHaveAttribute("data-dragging", "true");
  const draggedBox = await firstPage.boundingBox();

  if (restingBox === null || draggedBox === null) {
    throw new Error("The text page was not laid out.");
  }

  expect(draggedBox.x - restingBox.x).toBeCloseTo(-240, 0);

  await touchViewport(page, "touchend");

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 4");
  await expect(firstPage).toHaveAccessibleName("Character notes");
});
