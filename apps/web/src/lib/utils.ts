import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s-.]/g, '');
  if (cleaned.length < 7) return phone;
  return cleaned.replace(/(\+?\d+?)(\d{3})(\d{3})$/, '$1 $2 $3');
}

export function capitalizeWords(str?: string): string {
  if (!str) return "";
  // User requested: All organization names and employee names MUST be fully UPPERCASE.
  return str.toUpperCase();
}

/**
 * Returns the URL for an optimized avatar variant.
 * @param url The base URL from the database (e.g., /uploads/avatars/123-456)
 * @param variant 'thumb' (80x80) | 'medium' (400x400) | 'orig' (original)
 * @returns The transformed URL suffix (e.g., /uploads/avatars/123-456_thumb.webp)
 */
export function getAvatarVariant(url?: string | null, variant: 'thumb' | 'medium' | 'orig' = 'thumb'): string | undefined {
  if (!url) return undefined;
  
  // If it's already an external HTTP link (like Google/Microsoft avatars) or a base64 string, return as is
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }
  
  // Strip any old extension if present (just in case)
  const baseUrl = url.replace(/\.[^/.]+$/, "");
  
  // If 'orig' is requested, map it to 'medium' as we only generate 2 files (thumb and medium)
  const suffix = variant === 'orig' ? 'medium' : variant;
  
  return `${baseUrl}_${suffix}.webp`;
}
