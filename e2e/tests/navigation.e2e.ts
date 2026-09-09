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
