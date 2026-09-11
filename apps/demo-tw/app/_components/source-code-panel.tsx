import type { PropsWithChildren } from "react";

interface SourceCodePanelProps {
  /** The path this app holds the file at, which the panel shows above it. */
  name: string;
}

/**
 * Prints the one file the demo above it is made of, exactly as it stands in
 * this repository, so that the sample can be read without opening another page.
 */
export const SourceCodePanel = ({
  children,
  name,
}: PropsWithChildren<SourceCodePanelProps>) => (
  <section
    aria-labelledby="source-code-heading"
    className="rounded-xl border border-slate-300 bg-white p-5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
  >
    <h2 className="font-semibold" id="source-code-heading">
      Source code
    </h2>
    <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400">
      {name}
    </p>
    <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-4 font-mono text-sm leading-6 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
      <code>{children}</code>
    </pre>
  </section>
);
