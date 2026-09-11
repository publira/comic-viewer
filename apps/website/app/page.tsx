import { Code } from "@sugar-high/react/core";
import type { CodeProps } from "@sugar-high/react/core";
import { vercel } from "@sugar-high/react/themes";
import * as typescript from "sugar-high/lang/typescript";

/**
 * The language configuration `Code` tokenizes with. `CodeProps` intersects
 * React's `HTMLAttributes`, whose `lang` is the HTML language attribute, so the
 * two leave no type a configuration object can be declared as.
 */
const typescriptLang = typescript as unknown as CodeProps["lang"];

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
      <p className="text-lg leading-7 text-slate-600 dark:text-slate-300">
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
            className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            key={feature.title}
          >
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              {feature.description}
            </p>
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="install-heading" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight" id="install-heading">
        Install it
      </h2>
      <pre className="overflow-x-auto rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <code>{INSTALL_COMMAND}</code>
      </pre>
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        React 19 or later is required as a peer dependency. Compose{" "}
        <code>ComicViewer.Root</code> with the parts the reader needs:
      </p>
      <Code
        className="overflow-hidden rounded-xl border border-slate-300 text-sm leading-6 shadow-sm dark:border-slate-700"
        lang={typescriptLang}
        theme={vercel}
        wrapLongLines={false}
      >
        {USAGE_SNIPPET}
      </Code>
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        Everything else — theming, controlled navigation, double-page grouping,
        lazy page metadata, plugins — is written down once, in the{" "}
        <a
          className="font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
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
              className="flex h-full flex-col rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm transition hover:border-sky-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-400 dark:hover:bg-slate-800"
              href={demo.href}
            >
              <span className="font-semibold">
                {demo.title} <span aria-hidden="true">↗</span>
              </span>
              <span className="mt-2 text-slate-600 dark:text-slate-300">
                {demo.description}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>

    <footer className="border-t border-slate-300 pt-6 text-sm dark:border-slate-700">
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {references.map((reference) => (
          <li key={reference.href}>
            <a
              className="font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
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
