import { TypeScriptCode } from "./typescript-code";

const INSTALL_COMMAND = "npm install @publira/comic-viewer";

/**
 * The smallest viewer that runs. Everything beyond it — theming, controlled
 * navigation, plugins — belongs to the usage reference this page links to,
 * which stays the one place the API is written down.
 */
const USAGE_SNIPPET = `import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import "@publira/comic-viewer/default.css";

const pages: ViewerPage[] = [
  { id: "page-1", src: "/pages/1.jpg", title: "Page 1" },
  { id: "page-2", src: "/pages/2.jpg", title: "Page 2" },
];

const Reader = () => (
  <ComicViewer.Root initialReadingDirection="rtl" pages={pages}>
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);
`;

/** What the library does, in the terms the README states them. */
const features = [
  {
    description:
      "Compose independent, tree-shakeable components and style them the way the rest of the application is styled. The bundled stylesheet is optional.",
    title: "Headless UI architecture",
  },
  {
    description:
      "The viewer switches between single pages and double-page spreads with the width of its container, and reads right to left or left to right.",
    title: "Responsive spreads",
  },
  {
    description:
      "Fetching, decryption, and transformation hang off the plugins API, so encrypted or generated pages need no fork of the viewer.",
    title: "Pluggable page pipeline",
  },
  {
    description:
      "Only the pages near the reader are kept in memory, so a long chapter of high-resolution images does not exhaust a mobile browser.",
    title: "Virtualization",
  },
];

/** The two deployed demos, each with the line that says how they differ. */
const demos = [
  {
    description: "The viewer with the bundled default.css stylesheet.",
    href: "https://demo.comic-viewer.publira.dev/",
    title: "Standard demo",
  },
  {
    description:
      "The same viewer styled through Tailwind CSS utilities on the public primitives, without the stylesheet.",
    href: "https://demo-tw.comic-viewer.publira.dev/",
    title: "Tailwind CSS demo",
  },
];

const references = [
  {
    href: "https://github.com/publira/comic-viewer",
    label: "GitHub repository",
  },
  {
    href: "https://www.npmjs.com/package/@publira/comic-viewer",
    label: "npm package",
  },
  {
    href: "https://github.com/publira/comic-viewer/blob/main/packages/core/README.md",
    label: "Usage reference",
  },
];

const Home = () => (
  <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-5 py-14 sm:px-8">
    <header className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Publira Comic Viewer
      </h1>
      <p className="text-muted-foreground text-lg leading-7">
        A composable, headless-UI React viewer for comics and manga. It provides
        the viewport, the spreads, and the page pipeline, and leaves the look of
        the reader to the application around it.
      </p>
    </header>

    <section aria-labelledby="features-heading" className="flex flex-col gap-4">
      <h2
        className="text-xl font-semibold tracking-tight"
        id="features-heading"
      >
        What it does
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <li
            className="border-border bg-card text-card-foreground rounded-xl border p-5 text-sm leading-6 shadow-sm"
            key={feature.title}
          >
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-muted-foreground mt-2">{feature.description}</p>
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="install-heading" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight" id="install-heading">
        Install it
      </h2>
      <pre className="border-border bg-card text-card-foreground overflow-x-auto rounded-xl border p-5 text-sm leading-6 shadow-sm">
        <code>{INSTALL_COMMAND}</code>
      </pre>
      <p className="text-muted-foreground text-sm leading-6">
        React 19 or later is required as a peer dependency. Compose{" "}
        <code>ComicViewer.Root</code> with the parts the reader needs:
      </p>
      <TypeScriptCode className="border-border overflow-hidden rounded-xl border text-sm leading-6 shadow-sm">
        {USAGE_SNIPPET}
      </TypeScriptCode>
      <p className="text-muted-foreground text-sm leading-6">
        Everything else — theming, controlled navigation, double-page grouping,
        lazy page metadata, plugins — is written down once, in the{" "}
        <a
          className="text-primary hover:text-accent-foreground font-semibold underline underline-offset-2"
          href="https://github.com/publira/comic-viewer/blob/main/packages/core/README.md"
        >
          usage reference
        </a>
        .
      </p>
    </section>

    <section aria-labelledby="demos-heading" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight" id="demos-heading">
        See it running
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {demos.map((demo) => (
          <li key={demo.href}>
            <a
              className="border-border bg-card text-card-foreground hover:border-primary hover:bg-accent hover:text-accent-foreground flex h-full flex-col rounded-xl border p-5 text-sm leading-6 shadow-sm transition"
              href={demo.href}
            >
              <span className="font-semibold">
                {demo.title} <span aria-hidden="true">↗</span>
              </span>
              <span className="text-muted-foreground mt-2">
                {demo.description}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>

    <footer className="border-border border-t pt-6 text-sm">
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {references.map((reference) => (
          <li key={reference.href}>
            <a
              className="text-primary hover:text-accent-foreground font-semibold underline underline-offset-2"
              href={reference.href}
            >
              {reference.label}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  </main>
);

export default Home;
