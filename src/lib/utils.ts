import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBaseItemName(itemId: string): string {
  return itemId.replace(/^(impure-|pure-)/, '')
}
