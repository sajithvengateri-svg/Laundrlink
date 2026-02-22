import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QRScannerModal } from '@/components/shared/QRScanner/QRScannerModal'
import { PhotoCaptureModal } from '@/components/shared/PhotoCapture/PhotoCaptureModal'
import { getBagByQR } from '@/services/bag.service'
import { createHandoff, uploadHandoffPhoto } from '@/services/handoff.service'
import { useActiveJob } from '@/hooks/useDriver'
import { useAuthStore } from '@/stores/authStore'
import type { HandoffStep } from '@/types/hub.types'

const MANUAL_STEPS: Array<{ step: HandoffStep; label: string; description: string }> = [
  { step: 'customer_to_driver', label: 'Pickup from Customer', description: 'Scan bag when collecting from a customer' },
  { step: 'hub_to_driver',      label: 'Pickup from Hub',      description: 'Scan bag when leaving the hub' },
  { step: 'driver_to_customer', label: 'Deliver to Customer',  description: 'Scan bag when delivering to a customer' },
  { step: 'driver_to_hub',      label: 'Return to Hub',        description: 'Scan bag when dropping off at a hub' },
]

type ScanState = 'select_step' | 'scanning' | 'photo' | 'success' | 'error'

export function DriverScanPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const driverId = profile?.id ?? ''
  const { data: activeJob } = useActiveJob()

  const [scanState, setScanState] = useState<ScanState>('select_step')
  const [selectedStep, setSelectedStep] = useState<HandoffStep | null>(null)
  const [scannedBag, setScannedBag] = useState<{ id: string; qr_code: string; current_order_id: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelectStep = (step: HandoffStep) => {
    setSelectedStep(step)
    setError(null)
    setScanState('scanning')
  }

  const handleScan = async (qrCode: string) => {
    setError(null)
    try {
      const bag = await getBagByQR(qrCode)
      if (!bag) {
        setError(`Bag not found: ${qrCode}`)
        setScanState('error')
        return
      }
      setScannedBag({ id: bag.id, qr_code: bag.qr_code, current_order_id: bag.current_order_id ?? null })
      setScanState('photo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
      setScanState('error')
    }
  }

  const handlePhotos = async (photos: File[]) => {
    if (!scannedBag || !selectedStep) return
    setIsSubmitting(true)
    setError(null)

    try {
      const orderId = scannedBag.current_order_id ?? activeJob?.order_id
      if (!orderId) throw new Error('No active order associated with this bag')

      const urls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadHandoffPhoto(photos[i], orderId, `manual-${Date.now()}`, i)
        urls.push(url)
      }

      const toUserId =
        selectedStep === 'driver_to_customer'
          ? (activeJob?.order?.customer as { id?: string } | null | undefined)?.id ?? ''
          : activeJob?.order?.hub?.id ?? ''

      await createHandoff({
        orderId,
        bagId: scannedBag.id,
        step: selectedStep,
        fromUserId: driverId,
        toUserId: toUserId || driverId,
        scannedById: driverId,
        photoUrls: urls,
      })

      setScanState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record handoff')
      setScanState('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setSelectedStep(null)
    setScannedBag(null)
    setError(null)
    setScanState('select_step')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/driver')} className="p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <p className="font-semibold text-gray-900">Manual Scan</p>
      </div>

      <div className="p-4 space-y-3">
        {scanState === 'select_step' && (
          <>
            <p className="text-sm text-gray-500 px-1">Select the type of handoff to record:</p>
            {MANUAL_STEPS.map(({ step, label, description }) => (
              <Card
                key={step}
                className="rounded-2xl border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSelectStep(step)}
              >
                <CardContent className="p-4">
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {scanState === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="font-semibold text-gray-900 text-lg mb-1">Handoff Recorded</p>
            <p className="text-gray-500 text-sm mb-8">
              Bag {scannedBag?.qr_code} — {selectedStep?.replace(/_/g, ' ')}
            </p>
            <Button className="w-full max-w-xs" onClick={reset}>
              Scan Another
            </Button>
          </div>
        )}

        {scanState === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <Button variant="outline" onClick={reset}>Try Again</Button>
          </div>
        )}
      </div>

      <QRScannerModal
        isOpen={scanState === 'scanning'}
        onClose={reset}
        onScan={(qr) => void handleScan(qr)}
        title={MANUAL_STEPS.find((s) => s.step === selectedStep)?.label ?? 'Scan Bag'}
      />

      <PhotoCaptureModal
        isOpen={scanState === 'photo' && !isSubmitting}
        onClose={reset}
        onCapture={(photos) => void handlePhotos(photos)}
        maxPhotos={3}
      />
    </div>
  )
}
