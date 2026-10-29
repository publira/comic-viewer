import { createContext, useContext, useMemo } from "react";
import type { ComponentPropsWithoutRef, JSX, PropsWithChildren } from "react";

import { composeClassName } from "./class-names";
import type { PageSide } from "./use-viewport-layout";
import type { ViewerSlot } from "./viewer-context";

interface ViewerSlotContextValue {
  /** How many pages the slot the page belongs to holds. */
  count: number;
  /** The one-based position the page takes among the pages of its slot. */
  position: number;
  /** The half of the spread the slot page takes in double-page mode. */
  side?: PageSide;
  slot: ViewerSlot;
}

const ViewerSlotContext = createContext<ViewerSlotContextValue | null>(null);

interface ViewerSlotProviderProps
  extends PropsWithChildren, ViewerSlotContextValue {}

/** Places one slot page inside the rail. Rendered by Viewport alone. */
export const ViewerSlotProvider = ({
  children,
  count,
  position,
  side,
  slot,
}: ViewerSlotProviderProps): JSX.Element => {
  const value = useMemo(
    () => ({ count, position, side, slot }),
    [count, position, side, slot]
  );

  return (
    <ViewerSlotContext.Provider value={value}>
      {children}
    </ViewerSlotContext.Provider>
  );
};

export type ViewerSlotPageProps = Omit<
  ComponentPropsWithoutRef<"div">,
  | "data-page-side"
  | "data-page-slot"
  | "data-slot-page"
  | "data-slot-page-count"
>;

const useViewerSlot = (
  componentName: string,
  slot: ViewerSlot
): ViewerSlotContextValue => {
  const context = useContext(ViewerSlotContext);

  if (context === null || context.slot !== slot) {
    throw new Error(
      `${componentName} must be written among the children of the viewer, which shows it at the ${slot} of the reading sequence. A server component cannot pass it there, so write the viewer and its slot pages in a client component.`
    );
  }

  return context;
};

interface SlotPageProps extends ViewerSlotPageProps {
  componentName: string;
  slot: ViewerSlot;
}

const SlotPage = ({
  children,
  className,
  componentName,
  slot,
  ...props
}: SlotPageProps) => {
  const { count, position, side } = useViewerSlot(componentName, slot);

  return (
    <div
      {...props}
      className={composeClassName("pcv-page pcv-page-slot", className)}
      data-page-side={side}
      data-page-slot={slot}
      data-slot-page={position}
      data-slot-page-count={count}
    >
      {children}
    </div>
  );
};

/**
 * An extra page shown before the first page of the document, holding whatever
 * content the reader should meet before the comic itself. It is turned to like
 * any other page, yet it stays out of the page count and out of the index
 * mapping of the page list, so the pages keep the numbers they are given.
 */
export const StartPage = (props: ViewerSlotPageProps): JSX.Element => (
  <SlotPage {...props} componentName="StartPage" slot="start" />
);

/**
 * An extra page shown after the last page of the document, such as a link to
 * the next chapter. Like StartPage, it stays out of the page count and out of
 * the index mapping of the page list.
 */
export const EndPage = (props: ViewerSlotPageProps): JSX.Element => (
  <SlotPage {...props} componentName="EndPage" slot="end" />
);
