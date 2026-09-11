import type { Metadata } from "next";

import { DemoNavigation } from "./_components/demo-navigation";

import "./globals.css";

export const metadata: Metadata = {
  description:
    "A Tailwind CSS styling reference for the Comic Viewer component",
  title: "Comic Viewer Tailwind CSS Demo",
};

/**
 * `scheme-light-dark` lets the app follow the reader's preference, which is
 * what the `dark:` utilities and the paired theme the source code panel
 * passes to Sugar High both read.
 */
const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html className="scheme-light-dark" lang="en">
    <body>
      <DemoNavigation />
      {children}
    </body>
  </html>
);

export default RootLayout;
