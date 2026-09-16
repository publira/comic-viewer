"use client";

import { Code } from "@sugar-high/react/core";
import type { CodeProps } from "@sugar-high/react/core";
import { vercel } from "@sugar-high/react/themes";
import * as typescript from "sugar-high/lang/typescript";

/**
 * The language configuration `Code` tokenizes with. `CodeProps` intersects
 * React's `HTMLAttributes`, whose `lang` is the HTML language attribute, so the
 * two leave no type a configuration object can be declared as.
 */
const typescriptLang = typescript as unknown as CodeProps["lang"];

interface SourceCodePanelProps {
  /** The file as it stands on disk, highlighted as TypeScript. */
  children: string;
  /** The path this app holds the file at, which the panel shows above it. */
  name: string;
}

/**
 * Prints the one file the demo above it is made of, exactly as it stands in
 * this repository, so that the sample can be read without opening another page.
 * It is a client module because the `core` entry of `@sugar-high/react` ships
 * `Code` behind a client directive, and the language configuration it tokenizes
 * with is made of functions, which a server component cannot pass across that
 * boundary.
 */
export const SourceCodePanel = ({ children, name }: SourceCodePanelProps) => (
  <section
    aria-labelledby="source-code-heading"
    className="rounded-xl border border-slate-300 bg-white p-5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
  >
    <h2 className="font-semibold" id="source-code-heading">
      Source code
    </h2>
    <Code
      className="mt-3 overflow-hidden rounded-lg border border-slate-200 leading-6 [--sh-font-family:var(--font-mono)] dark:border-slate-700"
      lang={typescriptLang}
      lineNumbers
      theme={vercel}
      title={name}
      wrapLongLines={false}
    >
      {children}
    </Code>
  </section>
);
