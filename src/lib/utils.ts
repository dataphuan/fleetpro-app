import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateDateCode, getCurrentYYMM, CODE_PREFIXES } from "@/utils/codegen";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate trip code in monthly format: CD{YYMM}-{seq}
 * Example: CD2604-01 (April 2026, trip #1)
 * This is a frontend fallback — Firestore counter is authoritative
 */
export function generateTripCode(existingCodes?: string[]): string {
  const yymm = getCurrentYYMM();
  let maxSeq = 0;
  
  if (existingCodes && existingCodes.length > 0) {
    const prefix = `CD${yymm}-`;
    for (const code of existingCodes) {
      if (code && code.startsWith(prefix)) {
        const seq = parseInt(code.split('-')[1], 10) || 0;
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }
  
  return `CD${yymm}-${String(maxSeq + 1).padStart(2, '0')}`;
}
