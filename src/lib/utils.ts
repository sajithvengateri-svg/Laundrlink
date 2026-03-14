import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

// ─── Tailwind class merging ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Currency formatting ───────────────────────────────────────────────────────
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

// ─── Date formatting ───────────────────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy, h:mm a')
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'h:mm a')
}

// ─── Address formatting ────────────────────────────────────────────────────────
export function formatAddress(address: {
  street?: string
  suburb?: string
  state?: string
  postcode?: string
}): string {
  const parts = [address.street, address.suburb, address.state, address.postcode].filter(Boolean)
  return parts.join(', ')
}

// ─── Phone formatting ──────────────────────────────────────────────────────────
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('61') && digits.length === 11) {
    return `+61 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return phone
}

// ─── Star rating display ───────────────────────────────────────────────────────
export function getStarLabel(stars: number): string {
  if (stars >= 4.8) return 'Exceptional'
  if (stars >= 4.5) return 'Excellent'
  if (stars >= 4.0) return 'Great'
  if (stars >= 3.5) return 'Good'
  return 'Average'
}

// ─── Generate a referral share URL ────────────────────────────────────────────
export function getReferralUrl(code: string): string {
  return `${window.location.origin}/join?ref=${code}`
}

// ─── Truncate text ────────────────────────────────────────────────────────────
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

// ─── Sleep (for retry logic) ──────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Safe JSON parse ──────────────────────────────────────────────────────────
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}
