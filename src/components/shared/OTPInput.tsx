import { useRef, useEffect, useCallback, useState, type ClipboardEvent, type KeyboardEvent, type ChangeEvent } from 'react'

interface OTPInputProps {
  onComplete: (code: string) => void
  disabled?: boolean
}

const OTP_LENGTH = 4

export function OTPInput({ onComplete, disabled = false }: OTPInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < OTP_LENGTH) {
      inputRefs.current[index]?.focus()
      inputRefs.current[index]?.select()
    }
  }, [])

  const triggerComplete = useCallback(
    (newDigits: string[]) => {
      const code = newDigits.join('')
      if (code.length === OTP_LENGTH && /^\d{4}$/.test(code)) {
        onComplete(code)
      }
    },
    [onComplete],
  )

  const handleChange = useCallback(
    (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      // Only allow a single digit
      const char = value.replace(/\D/g, '').slice(-1)

      setDigits((prev) => {
        const next = [...prev]
        next[index] = char
        if (char) {
          // Auto-advance to next box
          setTimeout(() => focusInput(index + 1), 0)
        }
        // Check completion after state update
        setTimeout(() => triggerComplete(next), 0)
        return next
      })
    },
    [focusInput, triggerComplete],
  )

  const handleKeyDown = useCallback(
    (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (!digits[index] && index > 0) {
          // Current box is empty — clear previous and move back
          e.preventDefault()
          setDigits((prev) => {
            const next = [...prev]
            next[index - 1] = ''
            return next
          })
          focusInput(index - 1)
        } else {
          // Clear current box
          setDigits((prev) => {
            const next = [...prev]
            next[index] = ''
            return next
          })
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        focusInput(index - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        focusInput(index + 1)
      }
    },
    [digits, focusInput],
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, OTP_LENGTH)
      if (!pasted) return

      const newDigits = Array(OTP_LENGTH).fill('')
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i]
      }
      setDigits(newDigits)

      // Focus the box after the last pasted digit, or the last box
      const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1)
      setTimeout(() => focusInput(focusIdx), 0)
      setTimeout(() => triggerComplete(newDigits), 0)
    },
    [focusInput, triggerComplete],
  )

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
          className={[
            // Size: 56px mobile, 64px desktop — well above 44px touch target
            'h-14 w-14 sm:h-16 sm:w-16',
            // Big centered monospace digit
            'text-center text-2xl sm:text-3xl font-bold font-mono',
            // Box styling
            'rounded-xl border-2 bg-white shadow-sm',
            'outline-none transition-all duration-150',
            // Default border
            'border-gray-300',
            // Focus ring — brand-blue
            'focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30',
            // Disabled state
            disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:border-gray-400',
            // Caret color
            'caret-brand-blue',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
