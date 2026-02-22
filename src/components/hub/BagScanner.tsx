import { useState } from 'react'
import { QrCode, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { QRScannerModal } from '@/components/shared/QRScanner/QRScannerModal'
import { PhotoCaptureModal } from '@/components/shared/PhotoCapture/PhotoCaptureModal'
import { getBagByQR } from '@/services/bag.service'
import { createHandoff, uploadHandoffPhoto } from '@/services/handoff.service'
import { useAuthStore } from '@/stores/authStore'
import type { BagWithOrder } from '@/types/bag.types'
import type { HandoffStep } from '@/types/hub.types'

interface BagScannerProps {
  hubId: string
  step: HandoffStep
  toUserId: string // who receives the bag at this step
  onComplete?: () => void
}

type ScanPhase = 'idle' | 'scanning' | 'photo' | 'processing' | 'done' | 'error'

export function BagScanner({ hubId: _hubId, step, toUserId, onComplete }: BagScannerProps) {
  const profile = useAuthStore((s) => s.profile)
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [bag, setBag] = useState<BagWithOrder | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)

  const handleQRScan = async (qrCode: string) => {
    setPhase('processing')
    setErrorMsg(null)
    try {
      const foundBag = await getBagByQR(qrCode)
      if (!foundBag) {
        setErrorMsg(`Bag "${qrCode}" not found in the system.`)
        setPhase('error')
        return
      }
      if (!foundBag.current_order_id) {
        setErrorMsg(`Bag "${qrCode}" is not assigned to any active order.`)
        setPhase('error')
        return
      }
      setBag(foundBag)
      setPhase('photo')
      setShowPhoto(true)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to look up bag')
      setPhase('error')
    }
  }

  const handlePhotos = async (files: File[]) => {
    if (!bag || !bag.current_order_id || !profile) return
    setPhase('processing')

    try {
      // Upload photos first, get URLs
      // We need a temporary handoff ID for the path — use a UUID-like timestamp key
      const tempId = `tmp-${Date.now()}`
      const photoUrls = await Promise.all(
        files.map((file, i) => uploadHandoffPhoto(file, bag.current_order_id!, tempId, i))
      )

      // Create handoff record
      await createHandoff({
        orderId: bag.current_order_id,
        bagId: bag.id,
        step,
        fromUserId: bag.current_holder_id ?? profile.id,
        toUserId,
        scannedById: profile.id,
        photoUrls,
      })

      setPhase('done')
      onComplete?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record handoff')
      setPhase('error')
    }
  }

  const reset = () => {
    setPhase('idle')
    setBag(null)
    setErrorMsg(null)
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div
            key="idle"
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="w-20 h-20 rounded-2xl bg-brand-blue/10 flex items-center justify-center">
              <QrCode className="h-10 w-10 text-brand-blue" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Tap the button below to open the camera and scan the bag's QR code.
            </p>
            <Button onClick={() => { setShowScanner(true); setPhase('scanning') }} size="lg">
              <QrCode className="h-5 w-5 mr-2" />
              Scan Bag QR
            </Button>
          </motion.div>
        )}

        {phase === 'processing' && (
          <motion.div
            key="processing"
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="h-10 w-10 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Processing…</p>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div
            key="done"
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-16 h-16 rounded-full bg-brand-teal/20 flex items-center justify-center">
              <motion.svg
                className="h-8 w-8 text-brand-teal"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4 }}
                />
              </motion.svg>
            </div>
            <p className="font-semibold text-brand-teal">Handoff Recorded</p>
            <Button variant="outline" size="sm" onClick={reset}>
              Scan Another
            </Button>
          </motion.div>
        )}

        {phase === 'error' && (
          <motion.div
            key="error"
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-14 h-14 rounded-full bg-brand-danger/10 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-brand-danger" />
            </div>
            <p className="text-sm text-brand-danger text-center">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={reset}>
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => { setShowScanner(false); if (phase === 'scanning') setPhase('idle') }}
        onScan={(code) => { setShowScanner(false); void handleQRScan(code) }}
        title="Scan Bag"
        hint="Point at the QR code on the bag tag"
      />

      <PhotoCaptureModal
        isOpen={showPhoto}
        onClose={() => { setShowPhoto(false); setPhase('idle') }}
        onCapture={(files) => { setShowPhoto(false); void handlePhotos(files) }}
        title="Handoff Photos"
        hint="Take photos showing the bag and its condition"
      />
    </div>
  )
}
