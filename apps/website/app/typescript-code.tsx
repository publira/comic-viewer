"use client";

import { Code } from "@sugar-high/react/core";
import type { CodeProps } from "@sugar-high/react/core";
import { vercel } from "@sugar-high/react/themes";
import * as typescript from "sugar-high/lang/typescript";

/** The language configuration `Code` tokenizes with. */
// SAFETY: `CodeProps` intersects React's `HTMLAttributes`, whose `lang` is the
// HTML language attribute, so the two leave no type an object can be declared
// as; `Code` reads the configuration alone.
const typescriptLang = typescript as CodeProps["lang"];

interface TypeScriptCodeProps {
  children: string;
  className?: string;
}

/**
 * A TypeScript block highlighted with the site's theme. It is a client module
 * because the `core` entry of `@sugar-high/react` ships `Code` behind a client
 * directive, and the language configuration it tokenizes with is made of
 * functions, which a server component cannot pass across that boundary.
 */
export const TypeScriptCode = ({
  children,
  className,
}: TypeScriptCodeProps) => (
  <Code
    className={className}
    lang={typescriptLang}
    theme={vercel}
    wrapLongLines={false}
  >
    {children}
  </Code>
);
