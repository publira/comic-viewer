# Comic Viewer Website

The landing page for `@publira/comic-viewer`, published at the apex domain [comic-viewer.publira.dev](https://comic-viewer.publira.dev/). It is a single statically rendered route, built with Tailwind CSS as the [Tailwind CSS demo](../demo-tw) is.

The apex is the address that gets shared and typed from memory, so this page answers what the library is, how it is installed, and where the two demos are, rather than dropping a visitor inside one of them.

## What it holds

- What the library is, and the four things it does, taken from the repository `README.md`.
- The install command and one minimal usage snippet.
- Links to both demos, each with the line that says how they differ.
- Links out to the GitHub repository, the npm package, and the usage reference.

`packages/core/README.md` stays the single usage reference. This page carries one snippet and links to that reference rather than growing an API section of its own, which would drift away from the library the moment either one changes.

## Run locally

From the repository root:

```bash
pnpm --filter @publira/comic-viewer-website dev
```

Open [http://localhost:5000](http://localhost:5000). The demos use ports 3000 and 4000, so all three applications can run together through `pnpm dev`.
