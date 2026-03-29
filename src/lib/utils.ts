import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateDateCode, getCurrentYYMM, CODE_PREFIXES } from "@/utils/codegen";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique trip code using standard CD+YYMM+3-digit format
 * Format: CDYYMM001 (e.g., CD2603001)
 * This is a frontend fallback — backend getNextCode() is authoritative
 */
export function generateTripCode(): string {
  const seq = Math.floor(Math.random() * 900) + 100; // Random 3-digit to avoid collisions
  return generateDateCode(CODE_PREFIXES.TRIP, seq, getCurrentYYMM());
}
