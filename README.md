# Publira Comic Viewer

A highly extensible, headless-UI inspired React comic viewer designed for modern web applications.

It provides robust core functionalities like memory-efficient virtualization, responsive double-page spreads, and reading direction controls, while leaving the UI and data fetching pipeline entirely customizable.

## Features

- **Headless UI Architecture:** Fully customize the look and feel using Compound Components.
- **Responsive Spread Views:** Automatically switches between single and double-page spreads based on container width.
- **Pluggable Data Pipeline:** Easily inject custom logic for data fetching, decryption (e.g., WASM/DRM), and analytics via the `plugins` API.
- **Virtualization & Memory Management:** Safely handles large volumes of high-resolution images or canvases without crashing mobile browsers.
- **Gesture & Keyboard Support:** Built-in support for swipe, click, and keyboard navigation.

## Installation

```bash
npm install @publira/comic-viewer
# or
yarn add @publira/comic-viewer
# or
pnpm add @publira/comic-viewer
```

## Basic Usage

Import the optional core CSS and assemble the viewer using the provided Compound Components. The stylesheet provides the default layout and appearance; omit it when you supply the viewer's styles yourself, including through `className` utilities.

```tsx
import { ComicViewer } from "@publira/comic-viewer";
import "@publira/comic-viewer/core.css";

function App() {
  const pages = [
    {
      id: "1",
      src: "https://example.com/page1.jpg",
      title: "Page 1",
      placeholder: "data:image/svg+xml,...",
      width: 1200,
      height: 1800,
    },
    {
      id: "2",
      src: "https://example.com/page2.jpg",
      title: "Page 2",
      placeholder: "data:image/svg+xml,...",
      width: 1200,
      height: 1800,
    },
    // ...
  ];

  return (
    <ComicViewer
      pages={pages}
      defaultDirection="rtl" // Right-to-Left (e.g., Japanese Manga)
    >
      <div className="viewer-layout">
        {/* Main viewing area (virtualized automatically) */}
        <ComicViewer.Viewport className="viewport-container" />

        {/* Custom Toolbar */}
        <ComicViewer.Toolbar className="toolbar-container">
          <ComicViewer.Slider />
          <ComicViewer.PageIndicator />
        </ComicViewer.Toolbar>
      </div>
    </ComicViewer>
  );
}
```

## Styling with Tailwind CSS

`core.css` is optional. When using Tailwind CSS, omit the stylesheet and apply the layout styles through `className` instead. The viewer and viewport need a defined size, flex layout, and hidden overflow.

```tsx
import { ComicViewer } from "@publira/comic-viewer";

export function Reader() {
  return (
    <ComicViewer
      pages={pages}
      className="relative flex h-screen w-full min-h-0 min-w-0 overflow-hidden bg-neutral-950 text-neutral-100"
    >
      <ComicViewer.Viewport className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden [&>*]:flex-1 [&>*]:min-w-0 [&>*]:items-center [&>*]:justify-center" />
    </ComicViewer>
  );
}
```

You can also provide all styles independently. Use `className` on the compound components, or provide `renderPage` to control page markup and styling.

## Advanced: Using Plugins

You can intercept and modify the data pipeline (e.g., decrypting binary images on the fly) using the `plugins` prop. Default pages are always decoded and rendered to a `canvas`. Provide an optional `placeholder` URL on each page to display a blurred preview while its full `src` is loading.

```tsx
import { ComicViewer, definePlugin } from "@publira/comic-viewer";

const myDecryptionPlugin = definePlugin({
  name: "my-decryption-plugin",
  afterFetch: async (buffer: ArrayBuffer) => {
    // Implement your custom decryption logic here (e.g., WASM XOR)
    return decryptData(buffer);
  },
});

function SecureApp() {
  return (
    <ComicViewer pages={securePages} plugins={[myDecryptionPlugin]}>
      <ComicViewer.Viewport />
    </ComicViewer>
  );
}
```

## License

[Apache License 2.0](LICENSE)
