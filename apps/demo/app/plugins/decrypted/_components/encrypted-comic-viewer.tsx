"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import { getViewerStyle } from "../../../_components/viewer-layout";

import styles from "../page.module.css";

const encryptionKey = new Uint8Array([
  45, 128, 94, 16, 201, 73, 5, 164, 220, 39, 177, 8, 93, 251, 14, 66, 57, 186,
  109, 34, 240, 12, 154, 80, 28, 198, 71, 115, 9, 166, 42, 203,
]);
const initializationVectorLength = 12;

const decryptPage = async (
  encryptedBuffer: ArrayBuffer
): Promise<ArrayBuffer> => {
  const encryptedPage = new Uint8Array(encryptedBuffer);
  const initializationVector = encryptedPage.slice(
    0,
    initializationVectorLength
  );
  const encryptedData = encryptedPage.slice(initializationVectorLength);
  const key = await crypto.subtle.importKey(
    "raw",
    encryptionKey,
    "AES-GCM",
    false,
    ["decrypt"]
  );

  return crypto.subtle.decrypt(
    { iv: initializationVector, name: "AES-GCM" },
    key,
    encryptedData
  );
};

/** Fetches a ciphertext page without exposing a renderable image URL. */
const fetchEncryptedPage = async ({
  signal,
  url,
}: ComicViewer.PageLoadContext): Promise<ArrayBuffer> => {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Failed to fetch encrypted page: ${response.status}`);
  }

  return response.arrayBuffer();
};

const encryptedJpegPlugin = ComicViewer.definePlugin({
  afterFetch: ({ buffer }) => decryptPage(buffer),
  customFetch: fetchEncryptedPage,
  name: "encrypted-jpeg",
});

const plugins = [encryptedJpegPlugin] as const;

interface EncryptedComicViewerProps {
  pages: readonly ViewerPage[];
}

/** Renders the decrypting plugin demo with the shared canvas viewer. */
export const EncryptedComicViewer = ({ pages }: EncryptedComicViewerProps) => (
  <div className={styles.viewer} style={getViewerStyle(pages)}>
    <ComicViewer.Root
      pages={pages}
      plugins={plugins}
      className={styles.viewerContent}
    >
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar />
      <ComicViewer.PageNavigation />
    </ComicViewer.Root>
  </div>
);
