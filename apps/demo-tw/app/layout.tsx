import type { Metadata } from "next";

import { DemoNavigation } from "./_components/demo-navigation";

import "./globals.css";

export const metadata: Metadata = {
  description:
    "A Tailwind CSS styling reference for the Comic Viewer component",
  title: "Comic Viewer Tailwind CSS Demo",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="en">
    <body>
      <DemoNavigation />
      {children}
    </body>
  </html>
);

export default RootLayout;
