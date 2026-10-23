import type { PropsWithChildren } from "react";

import "@publira/comic-viewer/default.css";

const RootLayout = ({ children }: PropsWithChildren) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
