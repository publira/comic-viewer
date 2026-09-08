# Publira Comic Viewer

A highly extensible, headless-UI inspired React comic viewer designed for modern web applications.

It provides robust core functionalities like memory-efficient virtualization, responsive double-page spreads, and reading direction controls, while leaving the UI and data fetching pipeline entirely customizable.

- [Standard demo](https://demo.comic-viewer.publira.dev/) — the viewer with the bundled `default.css` stylesheet.
- [Tailwind CSS demo](https://demo-tw.comic-viewer.publira.dev/) — the same viewer styled through utilities on the public primitives, without the stylesheet.

## Features

- **Headless UI Architecture:** Fully customize the look and feel by composing independent, tree-shakeable components.
- **Responsive Spread Views:** Automatically switches between single and double-page spreads based on container width.
- **Pluggable Data Pipeline:** Easily inject custom logic for data fetching, decryption (e.g., WASM/DRM), and analytics via the `plugins` API.
- **Virtualization & Memory Management:** Safely handles large volumes of high-resolution images or canvases without crashing mobile browsers.
- **Gesture & Keyboard Support:** Built-in support for swipe, click, and keyboard navigation.
- **Pages Around the Document:** Insert a notice, a cover card, or a next-chapter link before the first page or after the last one without disturbing the page numbering.

## Installation

```bash
npm install @publira/comic-viewer
# or
yarn add @publira/comic-viewer
# or
pnpm add @publira/comic-viewer
```

## Usage

Import the optional default stylesheet and assemble the viewer by composing `ComicViewer.Root` with the components you need.

```tsx
import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import "@publira/comic-viewer/default.css";

const pages: ViewerPage[] = [
  {
    id: "page-1",
    src: "https://example.com/pages/1.jpg",
    title: "Page 1",
    width: 1200,
    height: 1800,
  },
  {
    id: "page-2",
    src: "https://example.com/pages/2.jpg",
    title: "Page 2",
    width: 1200,
    height: 1800,
  },
];

function App() {
  return (
    <ComicViewer.Root pages={pages} initialReadingDirection="rtl">
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar />
      <ComicViewer.PageNavigation />
    </ComicViewer.Root>
  );
}
```

**[Read the full documentation in `packages/core/README.md`.](packages/core/README.md)** It is the reference for the whole library: theming, controlled navigation, double-page grouping, start and end pages, lazy page metadata, Tailwind CSS, the page loading state, page navigation, plugins, and versioning.

## Contributing

The repository is a [Turborepo](https://turborepo.com/) monorepo managed with [pnpm](https://pnpm.io/). Install the dependencies with `pnpm install`, then run the workspace commands from the repository root:

| Command          | Description                                        |
| ---------------- | -------------------------------------------------- |
| `pnpm build`     | Build every package and application.               |
| `pnpm dev`       | Run the demo applications in development mode.     |
| `pnpm test`      | Run the unit test suites.                          |
| `pnpm test:e2e`  | Run the Playwright end-to-end tests.               |
| `pnpm typecheck` | Run TypeScript type checking across the workspace. |
| `pnpm check`     | Run the linter and formatter checks.               |
| `pnpm fix`       | Apply the linter and formatter fixes.              |

See [`AGENTS.md`](AGENTS.md) for the repository conventions, including the Conventional Commits format used for commit messages and pull request titles.

## License

[Apache License 2.0](LICENSE)
