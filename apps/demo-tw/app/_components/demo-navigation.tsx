"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Basic" },
  { href: "/plugins/decrypted", label: "Decrypt" },
  { href: "/plugins/watermark", label: "Watermark" },
] as const;

/** Renders the same demo routes as the default-stylesheet application. */
export const DemoNavigation = () => {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-300/80 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-950/90">
      <div className="mx-auto w-full max-w-6xl px-5 pt-4 sm:px-8">
        <h1 className="text-xl font-bold tracking-tight">
          Comic Viewer Tailwind CSS Demo
        </h1>
        <nav
          className="mt-4 flex gap-2 overflow-x-auto"
          aria-label="Demo pages"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="rounded-t-lg border border-b-0 border-transparent px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 aria-[current=page]:border-slate-300 aria-[current=page]:bg-slate-100 aria-[current=page]:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:aria-[current=page]:border-slate-700 dark:aria-[current=page]:bg-slate-800 dark:aria-[current=page]:text-white"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
