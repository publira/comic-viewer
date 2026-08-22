import styles from "./source-code-panel.module.css";

interface SourceCodePanelProps {
  code: string;
  title?: string;
}

/** Displays the relevant example code beneath each interactive demo. */
export const SourceCodePanel = ({
  code,
  title = "Source code",
}: SourceCodePanelProps) => (
  <section className={styles.panel} aria-labelledby="source-code-heading">
    <h2 id="source-code-heading" className={styles.title}>
      {title}
    </h2>
    <pre className={styles.code}>
      <code>{code}</code>
    </pre>
  </section>
);
