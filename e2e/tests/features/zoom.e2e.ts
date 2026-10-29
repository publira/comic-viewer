import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { revealReaderControl } from "#helpers/reader";
import { currentPageSet, pageStatus, viewport } from "#helpers/selectors";

const zoomDemo = "/features/zoom";
const resetZoom = "Reset zoom";

/** The status the zoom demo reports its scale through. */
const getZoomScale = (page: Page) =>
  page.getByRole("status", { name: "Zoom scale" });

/** Expects a drag on the viewport to pan the zoomed spread, or not to. */
const expectPannable = async (page: Page, pannable: boolean) => {
  await (pannable
    ? expect(page.locator(viewport)).toHaveAttribute("data-pannable", "true")
    : expect(page.locator(viewport)).not.toHaveAttribute("data-pannable"));
};

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
  await page.goto(zoomDemo);

  const resetZoomButton = await revealReaderControl(page, resetZoom);
  const zoomScale = getZoomScale(page);

  await expect(zoomScale).toHaveText("100%");
  await expect(resetZoomButton).toBeDisabled();

  await pinchViewport(page, 100, 200);

  await expect(zoomScale).toHaveText("200%");
  await expectPannable(page, true);
});

test("returns a pinched spread to its fit mode from the context reset", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(zoomDemo);

  const resetZoomButton = await revealReaderControl(page, resetZoom);

  await pinchViewport(page, 100, 200);
  await expect(resetZoomButton).toBeEnabled();

  await resetZoomButton.click();

  await expect(getZoomScale(page)).toHaveText("100%");
  await expectPannable(page, false);
});

test("drops the zoom scale of the spread the reader turns away from", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(zoomDemo);

  await revealReaderControl(page, resetZoom);
  await pinchViewport(page, 100, 200);

  const zoomScale = getZoomScale(page);

  await expect(zoomScale).toHaveText("200%");

  await page.getByRole("button", { name: "Next page" }).click();

  await expect(page.locator(pageStatus)).toHaveText("Pages 3-4 of 21");
  await expect(zoomScale).toHaveText("100%");
});

test("zooms the spread in and out through setZoomScale", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(zoomDemo);

  const zoomInButton = await revealReaderControl(page, "Zoom in");
  const zoomOutButton = page.getByRole("button", { name: "Zoom out" });
  const zoomScale = getZoomScale(page);

  await zoomInButton.click();

  await expect(zoomScale).toHaveText("150%");
  await expectPannable(page, true);

  await zoomInButton.click();
  await zoomInButton.click();
  await zoomInButton.click();
  await zoomInButton.click();
  await zoomInButton.click();

  await expect(zoomScale).toHaveText("400%");
  await expect(zoomInButton).toBeDisabled();

  await page.getByRole("button", { name: resetZoom }).click();
  await zoomOutButton.click();

  await expect(zoomScale).toHaveText("50%");
  await expect(zoomOutButton).toBeDisabled();
  await expectPannable(page, false);
});

test("draws the zoom and the pan on the current spread", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(zoomDemo);

  const zoomInButton = await revealReaderControl(page, "Zoom in");
  const pageSet = page.locator(currentPageSet);

  await zoomInButton.click();

  await expect(pageSet).toHaveCSS("transform", "matrix(1.5, 0, 0, 1.5, 0, 0)");

  const box = await page.locator(viewport).boundingBox();

  if (box === null) {
    throw new Error("The viewport was not laid out.");
  }

  const centreX = box.x + box.width / 2;
  const centreY = box.y + box.height / 2;

  await page.mouse.move(centreX, centreY);
  await page.mouse.down();
  await page.mouse.move(centreX - 100, centreY, { steps: 5 });
  await page.mouse.up();

  await expect(pageSet).toHaveCSS(
    "transform",
    "matrix(1.5, 0, 0, 1.5, -100, 0)"
  );
});
