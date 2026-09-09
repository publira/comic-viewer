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

/** Renders the persistent navigation between the demo variants. */
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
    <header className="demo-header">
      <div className="demo-header-bar">
        <h1 className="demo-title">Comic Viewer Demo</h1>
        <CounterpartDemoLink />
      </div>
      <nav
        aria-label="Demo pages"
        className="demo-navigation"
        ref={navigationRef}
      >
        <ul className="demo-navigation-tabs">
          <li>
            <Link
              aria-current={pathname === basicRoute.href ? "page" : undefined}
              className="demo-navigation-link"
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
    </header>
  );
};
