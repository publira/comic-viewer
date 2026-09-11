import type { Metadata } from "next";

import "./globals.css";

/** The apex domain this site is published at. */
const SITE_URL = "https://comic-viewer.publira.dev";
const SITE_NAME = "Publira Comic Viewer";
const SITE_DESCRIPTION =
  "A composable, headless-UI React viewer for comics and manga, with responsive spreads, a plugin pipeline, and virtualized pages.";

/**
 * The apex is the address that gets shared, so the page carries the cards a
 * link preview reads as well as its own title and description.
 */
export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    description: SITE_DESCRIPTION,
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_NAME,
    type: "website",
    url: SITE_URL,
  },
  title: SITE_NAME,
  twitter: {
    card: "summary",
    description: SITE_DESCRIPTION,
    title: SITE_NAME,
  },
};

/**
 * `scheme-light-dark` lets the page follow the reader's preference, which is
 * what the `dark:` utilities and the theme Sugar High paints the snippet with
 * both read.
 */
const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html className="scheme-light-dark" lang="en">
    <body className="bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      {children}
    </body>
  </html>
);

export default RootLayout;
