import { type ClassValue, clsx } from "clsx";

/**
 * Utility function to merge Tailwind classes
 * Uses clsx to combine class names conditionally
 */
export const cn = (...inputs: ClassValue[]) => {
  return clsx(inputs);
};
