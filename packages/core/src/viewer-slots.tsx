import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
} from "react";
import type {
  ComponentPropsWithoutRef,
  PropsWithChildren,
  ReactNode,
} from "react";

import { composeClassName } from "./class-names";
import type { PageSide } from "./use-viewport-layout";
import type { ViewerSlot, ViewerSlotPages } from "./viewer-context";

interface ViewerSlotContextValue {
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
  side,
  slot,
}: ViewerSlotProviderProps) => {
  const value = useMemo(() => ({ side, slot }), [side, slot]);

  return (
    <ViewerSlotContext.Provider value={value}>
      {children}
    </ViewerSlotContext.Provider>
  );
};

export type ViewerSlotPageProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "data-page-side" | "data-page-slot"
>;

const useViewerSlot = (
  componentName: string,
  slot: ViewerSlot
): ViewerSlotContextValue => {
  const context = useContext(ViewerSlotContext);

  if (context === null || context.slot !== slot) {
    throw new Error(
      `${componentName} must be written among the children of the viewer, which shows it at the ${slot} of the reading sequence.`
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
  const { side } = useViewerSlot(componentName, slot);

  return (
    <div
      {...props}
      className={composeClassName("pcv-page pcv-page-slot", className)}
      data-page-side={side}
      data-page-slot={slot}
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
export const StartPage = (props: ViewerSlotPageProps) => (
  <SlotPage {...props} componentName="StartPage" slot="start" />
);

/**
 * An extra page shown after the last page of the document, such as a link to
 * the next chapter. Like StartPage, it stays out of the page count and out of
 * the index mapping of the page list.
 */
export const EndPage = (props: ViewerSlotPageProps) => (
  <SlotPage {...props} componentName="EndPage" slot="end" />
);

export interface ViewerSlotChildren extends ViewerSlotPages {
  /** The children left once the slot pages are taken out of the tree. */
  children: ReactNode;
}

/**
 * Splits the children of the viewer root into its slot pages and the rest of
 * the tree, so that a StartPage or an EndPage written as a child reaches the
 * rail instead of being rendered where it stands.
 */
export const extractViewerSlotPages = (
  children: ReactNode
): ViewerSlotChildren => {
  const slotPages: ViewerSlotPages = {};
  // oxlint-disable-next-line react/no-react-children -- Only Children enumerates the root children without losing the keys they are rendered with.
  const rest = Children.toArray(children).filter((child) => {
    if (!isValidElement(child)) {
      return true;
    }

    // A slot holds one page, so a second one would take the place of the
    // first and leave it nowhere to be seen.
    if (child.type === StartPage) {
      if (slotPages.startPage !== undefined) {
        throw new Error("A viewer takes only one StartPage.");
      }

      slotPages.startPage = child;
      return false;
    }

    if (child.type === EndPage) {
      if (slotPages.endPage !== undefined) {
        throw new Error("A viewer takes only one EndPage.");
      }

      slotPages.endPage = child;
      return false;
    }

    return true;
  });

  return { ...slotPages, children: rest };
};
