import type { Page } from "@playwright/test";

import { progressSlider, toolbar } from "#helpers/selectors";

/** The width both demos give the thumb of the reading-progress slider. */
const SLIDER_THUMB_WIDTH = 14;

export interface SliderGeometry {
  centreY: number;
  isRightToLeft: boolean;
  max: number;
  min: number;
  trackStart: number;
  trackWidth: number;
}

export const getSliderGeometry = async (
  page: Page
): Promise<SliderGeometry> => {
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
export const getSliderX = (geometry: SliderGeometry, index: number): number => {
  const ratio = (index - geometry.min) / (geometry.max - geometry.min);

  return (
    geometry.trackStart +
    (geometry.isRightToLeft ? 1 - ratio : ratio) * geometry.trackWidth
  );
};

/** Presses the thumb where it rests and drags it to an x coordinate. */
export const dragSliderThumbToX = async (
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
export const dragSliderThumbTo = async (page: Page, index: number) => {
  const geometry = await getSliderGeometry(page);

  await dragSliderThumbToX(page, geometry, getSliderX(geometry, index));
};

/** Drags the reading-progress thumb to a share of the track from its left. */
export const dragSliderThumbToFraction = async (
  page: Page,
  fraction: number
) => {
  const geometry = await getSliderGeometry(page);

  await dragSliderThumbToX(
    page,
    geometry,
    geometry.trackStart + fraction * geometry.trackWidth
  );
};
