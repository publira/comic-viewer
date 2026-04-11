import type { PropsWithChildren } from "react";

export interface ToolbarProps extends PropsWithChildren {
  className?: string;
}

export const Toolbar = ({ children, className }: ToolbarProps) => (
  <div
    className={`pcv-toolbar${className === undefined ? "" : ` ${className}`}`}
  >
    {children}
  </div>
);
