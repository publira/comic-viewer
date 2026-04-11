import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  description: "A demo application showcasing the Comic Viewer component",
  title: "Comic Viewer Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
