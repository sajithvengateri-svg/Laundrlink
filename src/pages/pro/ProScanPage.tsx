import { useState } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QRScannerModal } from '@/components/shared/QRScanner/QRScannerModal'
import { PhotoCaptureModal } from '@/components/shared/PhotoCapture/PhotoCaptureModal'
import { useProActiveJobs } from '@/hooks/usePro'
import { useAuthStore } from '@/stores/authStore'
import { getBagByQR } from '@/services/bag.service'
import { createHandoff, uploadHandoffPhoto } from '@/services/handoff.service'

type ScanStep = 'select' | 'scanning' | 'photo' | 'submitting' | 'success' | 'error'
type HandoffType = 'hub_to_pro' | 'pro_to_hub'

const HANDOFF_LABELS: Record<HandoffType, { title: string; description: string }> = {
  hub_to_pro: {
    title: 'Receive Bags from Hub',
    description: 'Scan bag QR to confirm you have received them from the hub.',
  },
  pro_to_hub: {
    title: 'Return Bags to Hub',
    description: 'Scan bag QR to confirm you are returning clean bags to the hub.',
  },
}

export function ProScanPage() {
  const { user } = useAuthStore()
  const { data: activeJobs } = useProActiveJobs()
  const activeJob = activeJobs?.[0]

  const [step, setStep] = useState<ScanStep>('select')
  const [handoffType, setHandoffType] = useState<HandoffType>('hub_to_pro')
  const [error, setError] = useState<string | null>(null)
  const [scannedQr, setScannedQr] = useState<string | null>(null)

  const handleScan = (qr: string) => {
    setScannedQr(qr)
    setStep('photo')
  }

  const handlePhotos = async (photos: File[]) => {
    if (!user || !activeJob) return
    setStep('submitting')
    setError(null)

    try {
      // Look up bag from QR
      const bag = await getBagByQR(scannedQr ?? '')
      if (!bag) throw new Error('Bag not found — check the QR code and try again.')

      // Upload photos
      const photoUrls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadHandoffPhoto(
          photos[i],
          activeJob.id,
          `handoff-${handoffType}-${i}`
        )
        photoUrls.push(url)
      }

      // Create handoff record
      await createHandoff({
        orderId: activeJob.id,
        bagId: bag.id,
        step: handoffType,
        fromUserId: handoffType === 'hub_to_pro'
          ? (activeJob.hub as { id: string } | undefined | null)?.id ?? ''
          : user.id,
        toUserId: handoffType === 'hub_to_pro'
          ? user.id
          : (activeJob.hub as { id: string } | undefined | null)?.id ?? '',
        scannedById: user.id,
        photoUrls,
      })

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed. Please try again.')
      setStep('error')
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Handoff Recorded</h1>
        <p className="text-gray-500 text-sm mb-6">
          {handoffType === 'hub_to_pro'
            ? 'Bags confirmed received from hub.'
            : 'Bags confirmed returned to hub.'}
        </p>
        <Button onClick={() => { setStep('select'); setScannedQr(null) }}>
          Scan Another
        </Button>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Scan Failed</h1>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <Button variant="outline" onClick={() => setStep('select')}>Try Again</Button>
      </div>
    )
  }

  // ── Submitting ────────────────────────────────────────────────────────────
  if (step === 'submitting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-indigo-600 animate-pulse text-lg font-medium">Recording handoff…</p>
      </div>
    )
  }

  // ── Select + Scan ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Scan Bags</h1>
        <p className="text-sm text-gray-500">Record bag handoffs with your camera</p>
      </div>

      <div className="p-4 space-y-4">
        {/* No active job warning */}
        {!activeJob && (
          <Card className="rounded-2xl border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                No active job. You need an assigned order to scan bags.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active job context */}
        {activeJob && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                Active Order
              </p>
              <p className="font-semibold text-gray-900">#{activeJob.order_number}</p>
              <p className="text-sm text-gray-500">
                {(activeJob.hub as { business_name?: string } | undefined | null)?.business_name ?? 'Hub'} ·{' '}
                {activeJob.bags?.length ?? 0} bag{(activeJob.bags?.length ?? 0) !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Handoff type selector */}
        <div className="space-y-3">
          {(Object.keys(HANDOFF_LABELS) as HandoffType[]).map((type) => (
            <button
              key={type}
              onClick={() => setHandoffType(type)}
              className={[
                'w-full text-left rounded-2xl border p-4 transition-colors',
                handoffType === type
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-100 bg-white shadow-sm',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <div
                  className={[
                    'w-4 h-4 rounded-full border-2 flex-shrink-0',
                    handoffType === type
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300',
                  ].join(' ')}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {HANDOFF_LABELS[type].title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {HANDOFF_LABELS[type].description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Button
          className="w-full h-14 rounded-2xl text-base"
          disabled={!activeJob}
          onClick={() => setStep('scanning')}
        >
          Open Camera & Scan Bag
        </Button>
      </div>

      <QRScannerModal
        isOpen={step === 'scanning'}
        onClose={() => setStep('select')}
        onScan={handleScan}
        title={HANDOFF_LABELS[handoffType].title}
      />

      <PhotoCaptureModal
        isOpen={step === 'photo'}
        onClose={() => setStep('select')}
        onCapture={(photos) => void handlePhotos(photos)}
        maxPhotos={2}
      />
    </div>
  )
}
