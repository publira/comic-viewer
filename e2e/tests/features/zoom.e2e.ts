import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { revealReaderControl } from "#helpers/reader";
import { viewport } from "#helpers/selectors";

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
  await page.goto("/features/zoom");

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
  await page.goto("/features/zoom");

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
  await page.goto("/features/zoom");

  await revealReaderControl(page, "Reset zoom");
  await pinchViewport(page, 100, 200);

  const zoomScale = page.getByRole("status", { name: "Zoom scale" });

  await expect(zoomScale).toHaveText("200%");

  await page.getByRole("button", { name: "Next page" }).click();

  await expect(page.locator(".pcv-page-status")).toHaveText("Pages 3-4 of 21");
  await expect(zoomScale).toHaveText("100%");
});
