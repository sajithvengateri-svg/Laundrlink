import { useRef, useState, useCallback } from 'react'
import { Camera, X, Check, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PhotoCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (files: File[]) => void
  maxPhotos?: number
  title?: string
  hint?: string
}

export function PhotoCaptureModal({
  isOpen,
  onClose,
  onCapture,
  maxPhotos = 3,
  title = 'Take Photos',
  hint = 'Take clear photos of the bag and its contents',
}: PhotoCaptureModalProps) {
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])
  const [capturing, setCapturing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (!files.length) return

      const remaining = maxPhotos - photos.length
      const toAdd = files.slice(0, remaining)

      const newPhotos = toAdd.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))

      setPhotos((prev) => [...prev, ...newPhotos])
      // Reset input so same file can be re-selected
      e.target.value = ''
    },
    [photos.length, maxPhotos]
  )

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleConfirm = () => {
    onCapture(photos.map((p) => p.file))
    // Cleanup preview URLs
    photos.forEach((p) => URL.revokeObjectURL(p.preview))
    setPhotos([])
    onClose()
  }

  const handleClose = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.preview))
    setPhotos([])
    onClose()
  }

  if (!isOpen) return null

  const canAddMore = photos.length < maxPhotos

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col bg-gray-900"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-safe-top pb-3 bg-gray-900 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold text-lg">{title}</h2>
            <p className="text-gray-400 text-sm">{hint}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-gray-700 text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Photo grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-800">
                <img
                  src={photo.preview}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Add photo slot */}
            {canAddMore && (
              <button
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'aspect-square rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center gap-1.5 text-gray-400',
                  capturing && 'opacity-50 pointer-events-none'
                )}
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">
                  {photos.length === 0 ? 'Add Photo' : 'Add More'}
                </span>
              </button>
            )}
          </div>

          {photos.length === 0 && (
            <p className="text-center text-gray-500 text-sm mt-8">
              Minimum 1 photo required to proceed
            </p>
          )}
        </div>

        {/* Hidden file input — accepts camera on mobile */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Footer */}
        <div className="flex gap-3 px-4 py-4 pb-safe-bottom bg-gray-900 border-t border-gray-700">
          <Button
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300"
            onClick={() => {
              setCapturing(true)
              inputRef.current?.click()
              setCapturing(false)
            }}
            disabled={!canAddMore}
          >
            <Camera className="h-4 w-4 mr-2" />
            {photos.length === 0 ? 'Take Photo' : 'Add Another'}
          </Button>

          <Button
            className="flex-1"
            disabled={photos.length === 0}
            onClick={handleConfirm}
          >
            <Check className="h-4 w-4 mr-2" />
            Confirm ({photos.length})
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
