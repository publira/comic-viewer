import { readFile } from "node:fs/promises";
import path from "node:path";

export interface DemoSourceFile {
  /** The file as it stands on disk, for a code panel to print verbatim. */
  code: string;
  /** The path this app holds the file at, as the panel labels it. */
  path: string;
}

/**
 * Reads one of this app's own source files, so that a code panel shows the
 * component a demo renders instead of a copy of it kept up to date by hand.
 * The demo pages are rendered on the server, which is where the files are.
 *
 * @param filePath A path inside `app`, such as `features/zoom/_components/zoom-reader.tsx`.
 */
export const readDemoSource = async (
  filePath: string
): Promise<DemoSourceFile> => {
  const code = await readFile(
    path.join(process.cwd(), "app", filePath),
    "utf-8"
  );

  return { code: code.trimEnd(), path: `app/${filePath}` };
};
