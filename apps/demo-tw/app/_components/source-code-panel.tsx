interface SourceCodePanelProps {
  code: string;
  title?: string;
}

/** Displays the relevant example code beneath each interactive demo. */
export const SourceCodePanel = ({
  code,
  title = "Source code",
}: SourceCodePanelProps) => (
  <section
    aria-labelledby="source-code-heading"
    className="rounded-xl border border-slate-300 bg-white p-5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
  >
    <h2 id="source-code-heading" className="font-semibold">
      {title}
    </h2>
    <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-4 font-mono text-sm leading-6 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
      <code>{code}</code>
    </pre>
  </section>
);
