import { useRef, useState } from 'react'
import ReactSignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { RotateCcw, Check } from 'lucide-react'

interface SignatureCanvasProps {
  onConfirm: (signatureFile: File) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function SignatureCanvas({ onConfirm, onCancel, isLoading = false }: SignatureCanvasProps) {
  const canvasRef = useRef<ReactSignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const handleClear = () => {
    canvasRef.current?.clear()
    setIsEmpty(true)
  }

  const handleStrokeEnd = () => {
    setIsEmpty(canvasRef.current?.isEmpty() ?? true)
  }

  const handleConfirm = () => {
    if (!canvasRef.current || canvasRef.current.isEmpty()) return

    // Convert canvas to Blob then to File
    canvasRef.current.getCanvas().toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'signature.png', { type: 'image/png' })
      onConfirm(file)
    }, 'image/png')
  }

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white relative">
        <ReactSignatureCanvas
          ref={canvasRef}
          penColor="#1a1a2e"
          canvasProps={{
            className: 'w-full touch-none',
            style: { height: 160 },
          }}
          onEnd={handleStrokeEnd}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground">Sign here</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty || isLoading}
          className="flex-1"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={isEmpty || isLoading}
          className="flex-1"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          {isLoading ? 'Saving…' : 'Confirm'}
        </Button>
      </div>
    </div>
  )
}
