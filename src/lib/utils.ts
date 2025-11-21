import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a string for searching by converting it to lowercase and removing diacritics (accents).
 * @param text The text to normalize.
 * @returns The normalized string.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD") // Decomposes combined graphemes into base characters and diacritics
    .replace(/[\u0300-\u036f]/g, ""); // Removes the diacritics
}
