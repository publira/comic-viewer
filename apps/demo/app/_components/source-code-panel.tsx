"use client";

import { Code } from "@sugar-high/react/core";
import type { CodeProps } from "@sugar-high/react/core";
import { vercel } from "@sugar-high/react/themes";
import * as typescript from "sugar-high/lang/typescript";

import styles from "./source-code-panel.module.css";

/**
 * The language configuration `Code` tokenizes with. `CodeProps` intersects
 * React's `HTMLAttributes`, whose `lang` is the HTML language attribute, so the
 * two leave no type a configuration object can be declared as.
 */
const typescriptLang = typescript as unknown as CodeProps["lang"];

interface SourceCodePanelProps {
  code: string;
  title?: string;
}

/**
 * Displays the relevant example code beneath each interactive demo. It is a
 * client module because the `core` entry of `@sugar-high/react` ships `Code`
 * behind a client directive, and the language configuration it tokenizes with is
 * made of functions, which a server component cannot pass across that boundary.
 */
export const SourceCodePanel = ({
  code,
  title = "Source code",
}: SourceCodePanelProps) => (
  <section className={styles.panel} aria-labelledby="source-code-heading">
    <h2 id="source-code-heading" className={styles.title}>
      {title}
    </h2>
    <Code
      className={styles.code}
      lang={typescriptLang}
      lineNumbers
      theme={vercel}
      wrapLongLines={false}
    >
      {code}
    </Code>
  </section>
);
