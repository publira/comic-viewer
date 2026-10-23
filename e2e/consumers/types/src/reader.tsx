import * as ComicViewer from "@publira/comic-viewer";
import type { PageStatusValue, ViewerPage } from "@publira/comic-viewer";

const pages: ViewerPage[] = [
  { id: "page-1", src: "/pages/1.jpg", title: "Page 1" },
  {
    height: 1000,
    id: "page-2",
    layout: "spread",
    src: "/pages/2.jpg",
    title: "Page 2",
    width: 1600,
  },
];

const formatPageStatus = ({ firstPage, pageCount }: PageStatusValue) =>
  `${firstPage} / ${pageCount}`;

const watermarkPlugin = ComicViewer.definePlugin({
  afterDecode: ({ image }) => createImageBitmap(image),
  name: "watermark",
});

export const Reader = () => (
  <ComicViewer.Root pages={pages} plugins={[watermarkPlugin]}>
    <ComicViewer.StartPage>Cover notice</ComicViewer.StartPage>
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar>
      <ComicViewer.PageProgress>
        <ComicViewer.PageStatus format={formatPageStatus} />
      </ComicViewer.PageProgress>
    </ComicViewer.Toolbar>
  </ComicViewer.Root>
);
