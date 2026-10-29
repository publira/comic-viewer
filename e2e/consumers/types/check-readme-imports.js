// Checks that every import the packaged README shows resolves to a shipped
// file, and writes those imports out for both tsconfig files to typecheck.
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const readme = await readFile(
  new URL("node_modules/@publira/comic-viewer/README.md", import.meta.url),
  "utf-8"
);

const codeBlocks = [
  ...readme.matchAll(/^```tsx\n(?<code>[\s\S]*?)^```$/gmu),
].map(({ groups }) => groups.code);

const imports = new Set(
  codeBlocks.flatMap((code) =>
    [...code.matchAll(/^import [^;]+;$/gmu)].map(([statement]) => statement)
  )
);

const members = new Set(
  codeBlocks.flatMap((code) =>
    [...code.matchAll(/\bComicViewer\.(?<name>\w+)/gu)].map(
      ({ groups }) => groups.name
    )
  )
);

if (imports.size === 0 || members.size === 0) {
  throw new Error("The README shows no imports or ComicViewer members.");
}

for (const statement of imports) {
  const { specifier } = statement.match(/"(?<specifier>[^"]+)";$/u).groups;
  const path = fileURLToPath(import.meta.resolve(specifier));

  if (!existsSync(path)) {
    throw new Error(`${specifier} resolves to ${path}, which is not shipped.`);
  }
}

const runtimeExports = await import("@publira/comic-viewer");
const missing = [...members].filter((name) => !(name in runtimeExports));

if (missing.length > 0) {
  throw new Error(`The README uses missing exports: ${missing.join(", ")}`);
}

await writeFile(
  new URL("src/readme.generated.tsx", import.meta.url),
  `${[...imports].join("\n")}

export const readmeMembers = [
${[...members].map((name) => `  ComicViewer.${name},`).join("\n")}
];
`
);

console.log(
  `The README's ${imports.size} imports and ${members.size} members resolve.`
);
