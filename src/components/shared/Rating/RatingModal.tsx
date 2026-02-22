/**
 * RatingModal — post-order rating flow.
 *
 * Steps through each entity (hub, pro, driver) one at a time.
 * For each entity: star rating → tag pills → optional written review.
 * Submits to order_ratings table and updates entity rating_avg.
 */
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StarRating } from './StarRating'
import { submitRating } from '@/services/rating.service'
import { useAuthStore } from '@/stores/authStore'
import { RATING_TAGS, ENTITY_LABELS } from '@/types/rating.types'
import type { RateEntity } from '@/types/rating.types'

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  entities: RateEntity[]
  onComplete?: () => void
}

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

export function RatingModal({
  isOpen,
  onClose,
  orderId,
  entities,
  onComplete,
}: RatingModalProps) {
  const { user } = useAuthStore()
  const [entityIndex, setEntityIndex] = useState(0)
  const [stars, setStars] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const entity = entities[entityIndex]
  const isLast = entityIndex === entities.length - 1

  function resetEntityState() {
    setStars(0)
    setSelectedTags([])
    setReviewText('')
    setError(null)
  }

  async function handleSubmit() {
    if (!user || !entity || stars === 0) {
      setError('Please select a star rating.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitRating({
        orderId,
        customerId: user.id,
        ratedEntityId: entity.id,
        ratedEntityType: entity.type,
        stars,
        tags: selectedTags,
        reviewText: reviewText.trim() || undefined,
      })

      if (isLast) {
        setDone(true)
        onComplete?.()
      } else {
        setEntityIndex((i) => i + 1)
        resetEntityState()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSkip() {
    if (isLast) {
      setDone(true)
      onComplete?.()
    } else {
      setEntityIndex((i) => i + 1)
      resetEntityState()
    }
  }

  function handleClose() {
    setEntityIndex(0)
    setDone(false)
    resetEntityState()
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />
        <div className="relative z-50 w-full max-w-md mx-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-8">

          {/* Success state */}
          {done ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Thanks for your feedback!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your ratings help improve the LaundrLink community.
              </p>
              <Button className="w-full rounded-2xl" onClick={handleClose}>
                Close
              </Button>
            </div>
          ) : entity ? (
            <>
              {/* Progress indicators */}
              {entities.length > 1 && (
                <div className="flex gap-1 mb-4">
                  {entities.map((_, i) => (
                    <div
                      key={i}
                      className={[
                        'flex-1 h-1 rounded-full',
                        i < entityIndex
                          ? 'bg-indigo-600'
                          : i === entityIndex
                          ? 'bg-indigo-400'
                          : 'bg-gray-200',
                      ].join(' ')}
                    />
                  ))}
                </div>
              )}

              {/* Entity header */}
              <div className="mb-5">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                  Rate your {ENTITY_LABELS[entity.type]}
                </p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">{entity.name}</h2>
              </div>

              {/* Stars */}
              <div className="flex flex-col items-center mb-5">
                <StarRating value={stars} onChange={setStars} size="lg" />
                {stars > 0 && (
                  <p className="text-sm font-medium text-amber-600 mt-2">
                    {STAR_LABELS[stars]}
                  </p>
                )}
              </div>

              {/* Tags */}
              {stars > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">
                    What stood out? (optional)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {RATING_TAGS[entity.type].map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          setSelectedTags((prev) =>
                            prev.includes(tag)
                              ? prev.filter((t) => t !== tag)
                              : [...prev, tag]
                          )
                        }
                        className={[
                          'px-3 py-1.5 rounded-full text-sm border transition-colors',
                          selectedTags.includes(tag)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300',
                        ].join(' ')}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional written review */}
              {stars > 0 && (
                <div className="mb-4">
                  <textarea
                    rows={2}
                    placeholder="Write a review… (optional)"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-red-500 mb-3">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 rounded-2xl text-gray-500"
                  onClick={handleSkip}
                  disabled={submitting}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1 rounded-2xl"
                  onClick={() => void handleSubmit()}
                  disabled={submitting || stars === 0}
                >
                  {submitting
                    ? 'Submitting…'
                    : isLast
                    ? 'Submit'
                    : 'Next'}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Dialog>
  )
}
