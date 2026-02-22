import { describe, it, expect } from 'vitest'
import { formatCents, formatDate, formatPhone, cn, truncate } from '@/lib/utils'

describe('formatCents', () => {
  it('formats whole dollars', () => {
    // Currency symbol varies by Node.js ICU data (A$45 or $45)
    expect(formatCents(4500)).toMatch(/\$45/)
  })

  it('formats cents with decimals', () => {
    expect(formatCents(4550)).toMatch(/\$45\.5/)
  })

  it('formats zero', () => {
    expect(formatCents(0)).toMatch(/\$0/)
  })
})

describe('formatPhone', () => {
  it('formats 10-digit Australian number', () => {
    const result = formatPhone('0400000000')
    expect(result).toBe('0400 000 000')
  })
})

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'skip', 'keep')).toBe('base keep')
  })
})

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates long strings', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })
})

describe('formatDate', () => {
  it('formats a date string correctly', () => {
    const result = formatDate('2024-01-15T00:00:00Z')
    expect(result).toMatch(/15 Jan 2024/)
  })
})
