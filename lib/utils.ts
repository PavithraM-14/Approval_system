import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  // Minimal class merge using clsx; remove tailwind-merge dependency
  return clsx(inputs);
}
