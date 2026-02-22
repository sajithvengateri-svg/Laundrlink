import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
}

const SIZE_CLASSES = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
}

export function StarRating({ value, onChange, size = 'md', readonly = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)

  const effectiveValue = hovered || value

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange(n)}
          className={[
            'transition-transform',
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95',
          ].join(' ')}
          aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
        >
          <Star
            className={[
              SIZE_CLASSES[size],
              'transition-colors',
              n <= effectiveValue
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-gray-200',
            ].join(' ')}
          />
        </button>
      ))}
    </div>
  )
}
