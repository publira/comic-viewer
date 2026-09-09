import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

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

  await page.goto("/features/spreads");
  await page.getByRole("link", { name: counterpart.link }).click();

  await expect(page).toHaveURL(/\/features\/spreads$/u);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    counterpart.heading
  );
});

/** The disclosure button one of the grouped demo menus opens from. */
const getNavigationTrigger = (page: Page, group: string) =>
  page
    .getByRole("navigation", { name: "Demo pages" })
    .getByRole("button", { name: group });

test("opens a navigation group from a click on its trigger", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = getNavigationTrigger(page, "Features");
  const spreadsLink = page.getByRole("link", { name: "Spreads" });

  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(spreadsLink).toBeHidden();

  await trigger.click();

  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(spreadsLink).toBeVisible();

  await spreadsLink.click();

  await expect(page).toHaveURL(/\/features\/spreads$/u);
});

test("keeps a hovered navigation group open as the pointer reaches its menu", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = getNavigationTrigger(page, "Features");
  const spreadsLink = page.getByRole("link", { name: "Spreads" });

  await trigger.hover();

  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const triggerBox = await trigger.boundingBox();
  const linkBox = await spreadsLink.boundingBox();

  if (triggerBox === null || linkBox === null) {
    throw new Error("The navigation menu was not laid out.");
  }

  // The pointer travels down from the trigger into the menu. A strip between
  // the two belonging to neither would be where the pointer left the group,
  // closing the menu it was on its way to.
  for (
    let y = triggerBox.y + triggerBox.height - 1;
    y < linkBox.y + linkBox.height / 2;
    y += 2
  ) {
    // oxlint-disable-next-line no-await-in-loop -- The pointer moves one step at a time, the way it crosses the gap.
    await page.mouse.move(linkBox.x + linkBox.width / 2, y);
  }

  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(spreadsLink).toBeVisible();
});

test("dismisses an open navigation group from the keyboard", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = getNavigationTrigger(page, "Recipes");

  await trigger.focus();
  await page.keyboard.press("Enter");

  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  // The arrow keys walk the menu the trigger opened.
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("link", { name: "Fullscreen" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("link", { name: "Progress" })).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("link", { name: "Progress" })).toBeHidden();
});

test("closes an open navigation group on a click outside it", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = getNavigationTrigger(page, "Plugins");

  await trigger.click();

  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("heading", { level: 1 }).click();

  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

/** How far the page reaches past the edge of the viewport, in pixels. */
const getHorizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );

test("fits the navigation on a phone without pushing the page sideways", async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 390 });
  await page.goto("/features/spreads");

  await expect(page.getByRole("link", { name: "Basic" })).toBeVisible();
  await expect.poll(() => getHorizontalOverflow(page)).toBe(0);

  // The last entry is the one whose menu would hang off the right edge, so it
  // is the one that has to stay inside the viewport.
  await getNavigationTrigger(page, "Plugins").click();

  await expect(page.getByRole("link", { name: "Watermark" })).toBeVisible();
  await expect.poll(() => getHorizontalOverflow(page)).toBe(0);

  const menuBox = await page.locator("nav ul[id]:not([hidden])").boundingBox();
  const viewportWidth = await page.evaluate(
    () => document.documentElement.clientWidth
  );

  if (menuBox === null) {
    throw new Error("The navigation menu was not laid out.");
  }

  expect(menuBox.x).toBeGreaterThanOrEqual(0);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewportWidth);
});

test("marks the group the page on screen belongs to", async ({ page }) => {
  await page.goto("/recipes/progress");

  await expect(getNavigationTrigger(page, "Recipes")).toHaveAttribute(
    "aria-current",
    "true"
  );
  await expect(getNavigationTrigger(page, "Features")).not.toHaveAttribute(
    "aria-current"
  );
  await expect(page.getByRole("link", { name: "Basic" })).not.toHaveAttribute(
    "aria-current"
  );

  await getNavigationTrigger(page, "Recipes").click();

  await expect(page.getByRole("link", { name: "Progress" })).toHaveAttribute(
    "aria-current",
    "page"
  );
});

test("redirects the flat path a demo used to live at", async ({ page }) => {
  await page.goto("/progress");

  await expect(page).toHaveURL(/\/recipes\/progress$/u);
  await expect(
    page.getByRole("heading", { name: "Remember the reading position" })
  ).toBeVisible();
});
