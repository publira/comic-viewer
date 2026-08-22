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

Import the core CSS and assemble the viewer using the provided Compound Components.

```tsx
import { ComicViewer } from "@publira/comic-viewer";
import "@publira/comic-viewer/core.css"; // Required layout constraints

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
