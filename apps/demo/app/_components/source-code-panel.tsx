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
 * Displays the relevant example code beneath each interactive demo. The block
 * is highlighted on the server: the `core` entry of `@sugar-high/react` carries
 * no client directive, so the browser is sent the markup and nothing else.
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
