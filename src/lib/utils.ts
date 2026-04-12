import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateDateCode, getCurrentYYMM, CODE_PREFIXES } from "@/utils/codegen";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique trip code using simple CD+4-digit format
 * Format: CD0001
 * This is a frontend fallback — backend getNextCode('trip') is authoritative
 */
export function generateTripCode(): string {
  const seq = Math.floor(Math.random() * 9000) + 1000; // Random 4-digit fallback
  return `CD${seq}`;
}
