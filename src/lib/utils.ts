import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getMonthlyPrefix, getNextCodeByPrefix } from "./code-generator";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate trip code in standardized monthly format: CDYYMM-NN
 * Example: CD2604-01 (April 2026, trip #1)
 */
export function generateTripCode(existingCodes?: string[]): string {
  return getNextCodeByPrefix(
    existingCodes || [],
    getMonthlyPrefix('CD'),
    2
  );
}
