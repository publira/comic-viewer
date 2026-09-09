"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CounterpartDemoLink } from "./counterpart-demo-link";
import { DemoNavigationMenu } from "./demo-navigation-menu";
import {
  basicRoute,
  demoRouteGroups,
  isRouteGroupCurrent,
} from "./demo-routes";

/** Renders the same demo routes as the default-stylesheet application. */
export const DemoNavigation = () => {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (openGroup === null) {
      return;
    }

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!navigationRef.current?.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openGroup]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-300/80 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-950/90">
      <div className="mx-auto w-full max-w-6xl px-5 pt-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            Comic Viewer Tailwind CSS Demo
          </h1>
          <CounterpartDemoLink />
        </div>
        <nav aria-label="Demo pages" className="mt-4" ref={navigationRef}>
          <ul className="flex gap-2">
            <li>
              <Link
                aria-current={pathname === basicRoute.href ? "page" : undefined}
                className="block rounded-t-lg border border-b-0 border-transparent px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 aria-[current=page]:border-slate-300 aria-[current=page]:bg-slate-100 aria-[current=page]:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:aria-[current=page]:border-slate-700 dark:aria-[current=page]:bg-slate-800 dark:aria-[current=page]:text-white"
                href={basicRoute.href}
              >
                {basicRoute.label}
              </Link>
            </li>
            {demoRouteGroups.map((group) => (
              <DemoNavigationMenu
                isCurrent={isRouteGroupCurrent(group, pathname)}
                isOpen={openGroup === group.label}
                items={group.items}
                key={group.label}
                label={group.label}
                onClose={() => setOpenGroup(null)}
                onOpen={() => setOpenGroup(group.label)}
                pathname={pathname}
              />
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};
