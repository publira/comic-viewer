"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Basic" },
  { href: "/spreads", label: "Spreads" },
  { href: "/ltr", label: "LTR" },
  { href: "/fullscreen", label: "Fullscreen" },
  { href: "/plugins/decrypted", label: "Decrypt" },
  { href: "/plugins/watermark", label: "Watermark" },
] as const;

/** Renders the persistent navigation between the demo variants. */
export const DemoNavigation = () => {
  const pathname = usePathname();

  return (
    <header className="demo-header">
      <h1 className="demo-title">Comic Viewer Demo</h1>
      <nav className="demo-navigation" aria-label="Demo pages">
        <div className="demo-navigation-tabs">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};
