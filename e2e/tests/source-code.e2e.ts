import { expect, test } from "@playwright/test";

/** The panel every demo page prints its sample code in. */
const panel = "section[aria-labelledby='source-code-heading']";
/** The block Sugar High highlights the sample into, and the parts of it. */
const codeBlock = `${panel} [data-sh-code]`;
const keywords = `${codeBlock} [data-sh-token-type="keyword"]`;
const lineNumbers = `${codeBlock} [data-sh-code-line-number]`;

test("highlights the sample code the demo is made of", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/features/zoom");

  await expect(
    page.getByRole("heading", { name: "Source code" })
  ).toBeVisible();

  // The keywords only carry a token type of their own once the TypeScript
  // language configuration reaches the parser.
  await expect(page.locator(keywords).first()).toHaveText("import");
  expect(await page.locator(keywords).count()).toBeGreaterThan(1);

  await expect(page.locator(lineNumbers).first()).toHaveText("1");
});

test("scrolls a long sample inside its own box at a phone width", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/features/zoom");

  const block = page.locator(`${codeBlock} pre`);
  await expect(block).toBeVisible();

  const overflow = await block.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));

  expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);

  // The lines run past the right edge of the block, and stop there: the
  // document itself is no wider than the viewport.
  const document = await page.evaluate(() => ({
    clientWidth: window.document.documentElement.clientWidth,
    scrollWidth: window.document.documentElement.scrollWidth,
  }));

  expect(document.scrollWidth).toBe(document.clientWidth);
});
