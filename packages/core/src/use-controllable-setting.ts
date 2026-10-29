import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface ControllableSetting<TValue> {
  /** Writes the local value without reporting it, for a change the viewer makes itself. */
  setUncontrolledValue: Dispatch<SetStateAction<TValue>>;
  setValue: (value: TValue) => void;
  value: TValue;
}

/**
 * Holds a reader setting that the application may control, the way
 * `currentIndex` is held: a controlled value is mirrored, and the setter
 * reports a change instead of writing it.
 */
export const useControllableSetting = <TValue>(
  controlledValue: TValue | undefined,
  initialValue: TValue,
  onChange: ((value: TValue) => void) | undefined
): ControllableSetting<TValue> => {
  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);
  const value = controlledValue ?? uncontrolledValue;

  const setValue = useCallback(
    (nextValue: TValue) => {
      if (nextValue === value) {
        return;
      }

      if (controlledValue === undefined) {
        setUncontrolledValue(nextValue);
      }

      onChange?.(nextValue);
    },
    [controlledValue, onChange, value]
  );

  return { setUncontrolledValue, setValue, value };
};
