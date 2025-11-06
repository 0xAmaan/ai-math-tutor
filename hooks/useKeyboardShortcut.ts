import { useEffect } from "react";

interface KeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export const useKeyboardShortcut = (
  options: KeyboardShortcutOptions,
  callback: () => void,
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if all modifier keys match
      const metaKeyMatch =
        options.metaKey === undefined || event.metaKey === options.metaKey;
      const ctrlKeyMatch =
        options.ctrlKey === undefined || event.ctrlKey === options.ctrlKey;
      const shiftKeyMatch =
        options.shiftKey === undefined || event.shiftKey === options.shiftKey;
      const altKeyMatch =
        options.altKey === undefined || event.altKey === options.altKey;

      // Check if the main key matches
      const keyMatch = event.key === options.key;

      if (
        metaKeyMatch &&
        ctrlKeyMatch &&
        shiftKeyMatch &&
        altKeyMatch &&
        keyMatch
      ) {
        event.preventDefault();
        event.stopPropagation();
        callback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    options.key,
    options.metaKey,
    options.ctrlKey,
    options.shiftKey,
    options.altKey,
    callback,
  ]);
};
