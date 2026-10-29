// Checks that the prerendered page holds both viewers, so a build that bailed
// out of rendering them cannot pass.
import { readFile } from "node:fs/promises";

const html = await readFile(
  new URL(".next/server/app/index.html", import.meta.url),
  "utf-8"
);

const expected = [
  'class="pcv-root"',
  'class="pcv-page-status"',
  "Start page written in a client component",
  'class="pcv-viewport-track slot-reader-track"',
];

const missing = expected.filter((text) => !html.includes(text));

if (missing.length > 0) {
  throw new Error(`The prerendered page lacks ${missing.join(", ")}.`);
}

console.log("The prerendered page holds both viewers.");
