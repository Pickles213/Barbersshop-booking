import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a time string (HH:MM or HH:MM:SS) to 12-hour AM/PM format.
 * Examples: "09:00" → "9:00 AM", "14:30" → "2:30 PM", "12:00" → "12:00 PM"
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Formats a Philippine mobile number to a readable "09XX XXX XXXX" format.
 * Works with "+639XXXXXXXXX", "639XXXXXXXXX", and "09XXXXXXXXX".
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+63") && cleaned.length === 13) {
    const main = cleaned.slice(3);
    return `0${main.slice(0, 3)} ${main.slice(3, 6)} ${main.slice(6)}`;
  }
  if (cleaned.startsWith("63") && cleaned.length === 12) {
    const main = cleaned.slice(2);
    return `0${main.slice(0, 3)} ${main.slice(3, 6)} ${main.slice(6)}`;
  }
  if (cleaned.startsWith("09") && cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}