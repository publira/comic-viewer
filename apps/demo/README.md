# Comic Viewer Demo

Demo application for Comic Viewer, styled with the bundled `@publira/comic-viewer/default.css` stylesheet.

It is deployed at [demo.comic-viewer.publira.dev](https://demo.comic-viewer.publira.dev/). The [Tailwind CSS demo](https://demo-tw.comic-viewer.publira.dev/) shows the same viewer styled through utilities instead.

## Routes

The demos are grouped by what each page teaches, and both applications expose the same set:

| Path | Holds |
| --- | --- |
| `/` | The entry point: placeholder-to-full-image loading. |
| `/features/...` | Capabilities the library provides directly: `spreads`, `spread-page`, `slots`, `ltr`, `controls`, `zoom`. |
| `/recipes/...` | Integration patterns an application builds on top of the library: `fullscreen`, `progress`, `lazy`. |
| `/plugins/...` | Page-pipeline plugins: `decrypted`, `watermark`. |

The flat paths these pages used to live at, such as `/spreads` or `/progress`, redirect to their grouped counterparts.

## Setup

```bash
pnpm install
```

## Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the demo.

## Build

```bash
pnpm build
```

## Start in production mode

```bash
pnpm start
```
