"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import type { FocusEvent, KeyboardEvent, PointerEvent } from "react";

import type { DemoRoute } from "./demo-routes";

const triggerClassName =
  "flex items-center gap-1.5 rounded-t-lg border border-b-0 border-transparent px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 aria-[current]:border-slate-300 aria-[current]:bg-slate-100 aria-[current]:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:aria-[current]:border-slate-700 dark:aria-[current]:bg-slate-800 dark:aria-[current]:text-white";

// The menu stands clear of the tab it opens from, and the gap that leaves
// belongs to neither of them: a pointer travelling down to the menu would leave
// the group there and close what it was on its way to. The `before` strip fills
// the gap so that it answers for the menu, and shows nothing while it does. It
// reaches back over the menu's own top border and no further, because anything
// taller would cover the bottom edge of the tab and eat its clicks.
const menuClassName =
  "absolute top-full left-0 z-30 mt-1 flex min-w-48 flex-col gap-0.5 rounded-lg border border-slate-300 bg-white p-1.5 shadow-lg before:absolute before:inset-x-0 before:bottom-full before:h-[calc(0.25rem+1px)] before:content-[''] dark:border-slate-700 dark:bg-slate-900";

const menuLinkClassName =
  "block rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 aria-[current=page]:bg-slate-100 aria-[current=page]:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:aria-[current=page]:bg-slate-800 dark:aria-[current=page]:text-white";

interface DemoNavigationMenuProps {
  isCurrent: boolean;
  isOpen: boolean;
  items: readonly DemoRoute[];
  label: string;
  onClose: () => void;
  onOpen: () => void;
  pathname: string;
}

/** The links of a menu, in the order they are rendered. */
const getMenuLinks = (menu: HTMLElement | null) => [
  ...(menu?.querySelectorAll("a") ?? []),
];

/** Moves focus onto one link of a menu, wrapping around at either end. */
const focusMenuLink = (menu: HTMLElement | null, index: number) => {
  const links = getMenuLinks(menu);

  if (links.length === 0) {
    return;
  }

  links[((index % links.length) + links.length) % links.length]?.focus();
};

/**
 * One group of the demo navigation, as a disclosure: a button that opens the
 * pages of the group in a menu. The click is the primary interaction so that
 * touch and keyboard both reach the menu, and a pointer that can hover opens
 * it on the way past as an enhancement.
 */
export const DemoNavigationMenu = ({
  isCurrent,
  isOpen,
  items,
  label,
  onClose,
  onOpen,
  pathname,
}: DemoNavigationMenuProps) => {
  const menuId = useId();
  const menuRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  /** Where focus goes once a menu opened by the keyboard is on screen. */
  const pendingFocusRef = useRef<"first" | "last" | null>(null);
  /** Only a menu the pointer opened is closed again when it leaves. */
  const openedByHoverRef = useRef(false);

  useEffect(() => {
    if (!isOpen || pendingFocusRef.current === null) {
      return;
    }

    focusMenuLink(
      menuRef.current,
      pendingFocusRef.current === "first" ? 0 : -1
    );
    pendingFocusRef.current = null;
  }, [isOpen]);

  /**
   * A click on the trigger of a menu the pointer opened on its way past pins
   * the menu open instead of closing what the same gesture just revealed.
   */
  const handleTriggerClick = () => {
    if (isOpen && !openedByHoverRef.current) {
      onClose();

      return;
    }

    openedByHoverRef.current = false;
    onOpen();
  };

  /** The arrows open a closed menu onto the end they point at. */
  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isOpen || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) {
      return;
    }

    event.preventDefault();
    openedByHoverRef.current = false;
    pendingFocusRef.current = event.key === "ArrowDown" ? "first" : "last";
    onOpen();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      // The trigger takes back the focus the menu it opened was holding.
      onClose();
      triggerRef.current?.focus();

      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();

    const step = event.key === "ArrowDown" ? 1 : -1;
    const links = getMenuLinks(menuRef.current);
    const activeIndex = links.indexOf(
      document.activeElement as HTMLAnchorElement
    );
    // Nothing in the menu holds the focus while the trigger does, and from
    // there the arrows step onto the end of the menu they point at.
    const fromIndex = activeIndex === -1 && step === -1 ? 0 : activeIndex;

    focusMenuLink(menuRef.current, fromIndex + step);
  };

  /** A menu whose group no longer holds the focus has been left behind. */
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    openedByHoverRef.current = false;
    onClose();
  };

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || isOpen) {
      return;
    }

    openedByHoverRef.current = true;
    onOpen();
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || !openedByHoverRef.current) {
      return;
    }

    openedByHoverRef.current = false;
    onClose();
  };

  return (
    <li>
      {/* The group holds the menu it opens and watches it for the events its
      button and links raise, which is a wrapper rather than a control. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The handlers only relay events the button and links inside already raise. */}
      <div
        className="relative"
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <button
          aria-controls={menuId}
          aria-current={isCurrent ? "true" : undefined}
          aria-expanded={isOpen}
          className={triggerClassName}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          type="button"
        >
          {label}
          <span aria-hidden="true">▾</span>
        </button>
        <ul
          className={menuClassName}
          hidden={!isOpen}
          id={menuId}
          ref={menuRef}
        >
          {items.map((item) => (
            <li key={item.href}>
              <Link
                aria-current={pathname === item.href ? "page" : undefined}
                className={menuLinkClassName}
                href={item.href}
                onClick={onClose}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
};
