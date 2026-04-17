import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateDateCode, getCurrentYYMM, CODE_PREFIXES } from "@/utils/codegen";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { getMonthlyPrefix, getNextCodeByPrefix } from "./code-generator";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate trip code in standardized monthly format: CD-YYMM-NN
 * Example: CD-2604-01 (April 2026, trip #1)
 */
export function generateTripCode(existingCodes?: string[]): string {
  return getNextCodeByPrefix(
    existingCodes || [],
    getMonthlyPrefix('CD'),
    2
  );
}
