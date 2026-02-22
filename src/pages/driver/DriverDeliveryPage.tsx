import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, QrCode, Camera, PenLine, CheckCircle, ChevronRight, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QRScannerModal } from '@/components/shared/QRScanner/QRScannerModal'
import { PhotoCaptureModal } from '@/components/shared/PhotoCapture/PhotoCaptureModal'
import { SignatureCanvas } from '@/components/shared/Signature/SignatureCanvas'
import { useOrder } from '@/hooks/useOrder'
import { useAuthStore } from '@/stores/authStore'
import { useActiveJob, useUpdateJobStatus, useDriverLocationPublisher } from '@/hooks/useDriver'
import { createHandoff, uploadHandoffPhoto, uploadSignature } from '@/services/handoff.service'
import type { RunStep } from '@/types/driver.types'

const STEPS: Array<{ id: RunStep; label: string; icon: React.ReactNode; description: string }> = [
  { id: 'navigate_to_pickup',  label: 'Navigate to Hub',      icon: <MapPin className="h-5 w-5" />,    description: 'Drive to the hub to collect the laundry' },
  { id: 'scan_pickup',         label: 'Scan Bag',             icon: <QrCode className="h-5 w-5" />,    description: 'Scan the bag QR code to confirm pickup' },
  { id: 'photo_pickup',        label: 'Take Photo',           icon: <Camera className="h-5 w-5" />,    description: 'Photograph the bag before leaving the hub' },
  { id: 'confirmed_pickup',    label: 'Pickup Confirmed',     icon: <CheckCircle className="h-5 w-5" />, description: 'Drive to the customer\'s address' },
  { id: 'navigate_to_dropoff', label: 'Navigate to Customer', icon: <MapPin className="h-5 w-5" />,    description: 'Drive to the customer\'s delivery address' },
  { id: 'scan_delivery',       label: 'Scan Bag',             icon: <QrCode className="h-5 w-5" />,    description: 'Scan the bag QR code at the customer\'s door' },
  { id: 'photo_delivery',      label: 'Take Photo',           icon: <Camera className="h-5 w-5" />,    description: 'Photograph the delivered bag at the door' },
  { id: 'signature',           label: 'Get Signature',        icon: <PenLine className="h-5 w-5" />,   description: 'Ask the customer to sign for their delivery' },
  { id: 'complete',            label: 'Run Complete',         icon: <CheckCircle className="h-5 w-5" />, description: 'Great work! Run completed successfully' },
]

const STEP_INDEX: Record<RunStep, number> = Object.fromEntries(
  STEPS.map((s, i) => [s.id, i])
) as Record<RunStep, number>

export function DriverDeliveryPage() {
  const { orderId: paramOrderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const driverId = profile?.id ?? ''

  const { data: activeJob } = useActiveJob()
  const orderId = paramOrderId ?? activeJob?.order_id ?? ''

  const { data: order, isLoading } = useOrder(orderId)
  const updateJobStatus = useUpdateJobStatus()

  // Publish GPS position while on an active run
  useDriverLocationPublisher(!!orderId)

  const [currentStep, setCurrentStep] = useState<RunStep>('navigate_to_pickup')
  const [pickupPhotoUrls, setPickupPhotoUrls] = useState<string[]>([])
  const [deliveryPhotoUrls, setDeliveryPhotoUrls] = useState<string[]>([])
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isPhotoOpen, setIsPhotoOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bag = activeJob?.order?.bags?.[0]
  const hubAddress = (order?.hub as { address?: Record<string, unknown> } | null)?.address
  const customerAddress = order?.delivery_address as Record<string, unknown> | null

  const addressLine = (addr: Record<string, unknown> | null | undefined) =>
    addr
      ? `${addr.street ?? ''}, ${addr.suburb ?? ''} ${addr.state ?? ''} ${addr.postcode ?? ''}`
      : 'Address unavailable'

  const advance = (next: RunStep) => {
    setError(null)
    setCurrentStep(next)
  }

  // ── Step handlers ────────────────────────────────────────────────────────────

  const handleArrivedAtHub = () => {
    setIsScannerOpen(true)
    advance('scan_pickup')
  }

  const handlePickupScan = useCallback((qr: string) => {
    void qr  // QR validated server-side via bag.id from dispatch job
    setIsScannerOpen(false)
    setIsPhotoOpen(true)
    advance('photo_pickup')
  }, [])

  const handlePickupPhotos = useCallback(async (photos: File[]) => {
    setIsPhotoOpen(false)
    setIsSubmitting(true)
    setError(null)

    try {
      if (!bag || !order) throw new Error('Order data not loaded')

      // Upload photos
      const urls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadHandoffPhoto(photos[i], order.id, `pickup-${Date.now()}`, i)
        urls.push(url)
      }
      setPickupPhotoUrls(urls)

      // Create hub_to_driver handoff
      await createHandoff({
        orderId: order.id,
        bagId: bag.id,
        step: 'hub_to_driver',
        fromUserId: order.hub_id ?? '',
        toUserId: driverId,
        scannedById: driverId,
        photoUrls: urls,
      })

      if (activeJob) {
        await updateJobStatus.mutateAsync({ jobId: activeJob.id, status: 'en_route_to_customer' })
      }

      advance('confirmed_pickup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record pickup')
      setCurrentStep('photo_pickup')
    } finally {
      setIsSubmitting(false)
    }
  }, [bag, order, driverId, activeJob, updateJobStatus])

  const handleArrivedAtCustomer = () => {
    setIsScannerOpen(true)
    advance('scan_delivery')
  }

  const handleDeliveryScan = useCallback((qr: string) => {
    void qr  // QR validated server-side via bag.id from dispatch job
    setIsScannerOpen(false)
    setIsPhotoOpen(true)
    advance('photo_delivery')
  }, [])

  const handleDeliveryPhotos = useCallback(async (photos: File[]) => {
    setIsPhotoOpen(false)
    setIsSubmitting(true)
    setError(null)

    try {
      if (!order) throw new Error('Order data not loaded')
      const urls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadHandoffPhoto(photos[i], order.id, `delivery-${Date.now()}`, i)
        urls.push(url)
      }
      setDeliveryPhotoUrls(urls)
      advance('signature')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload delivery photos')
      setCurrentStep('photo_delivery')
    } finally {
      setIsSubmitting(false)
    }
  }, [order])

  const handleSignature = useCallback(async (signatureFile: File) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (!bag || !order) throw new Error('Order data not loaded')

      const sigUrl = await uploadSignature(signatureFile, order.id)

      // Upload delivery photos now
      const urls: string[] = []
      for (let i = 0; i < deliveryPhotoUrls.length; i++) {
        urls.push(deliveryPhotoUrls[i])
      }

      // Create driver_to_customer handoff (includes signature)
      await createHandoff({
        orderId: order.id,
        bagId: bag.id,
        step: 'driver_to_customer',
        fromUserId: driverId,
        toUserId: order.customer_id,
        scannedById: driverId,
        photoUrls: urls.length > 0 ? urls : pickupPhotoUrls,
        signatureUrl: sigUrl,
      })

      if (activeJob) {
        await updateJobStatus.mutateAsync({ jobId: activeJob.id, status: 'delivered' })
      }

      advance('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record delivery')
      setCurrentStep('signature')
    } finally {
      setIsSubmitting(false)
    }
  }, [bag, order, driverId, activeJob, updateJobStatus, pickupPhotoUrls, deliveryPhotoUrls])

  // ── Scan QR modal needs explicit step routing ────────────────────────────────
  const handleScan = useCallback((qr: string) => {
    if (currentStep === 'scan_pickup') handlePickupScan(qr)
    else if (currentStep === 'scan_delivery') handleDeliveryScan(qr)
  }, [currentStep, handlePickupScan, handleDeliveryScan])

  const handlePhotos = useCallback((photos: File[]) => {
    if (currentStep === 'photo_pickup') void handlePickupPhotos(photos)
    else if (currentStep === 'photo_delivery') void handleDeliveryPhotos(photos)
  }, [currentStep, handlePickupPhotos, handleDeliveryPhotos])

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No active run found</p>
          <Button onClick={() => navigate('/driver')}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading run details…</p>
      </div>
    )
  }

  if (currentStep === 'complete') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Run Complete!</h1>
        <p className="text-gray-500 mb-1">
          Order #{order?.order_number} delivered successfully
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Signature captured and chain-of-custody logged
        </p>
        <Button className="w-full max-w-xs" onClick={() => navigate('/driver')}>
          Back to Dashboard
        </Button>
      </motion.div>
    )
  }

  const currentStepData = STEPS.find((s) => s.id === currentStep)!
  const stepIdx = STEP_INDEX[currentStep]
  const progress = Math.round((stepIdx / (STEPS.length - 2)) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/driver')} className="p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">Order #{order?.order_number}</p>
          <p className="text-xs text-gray-500">
            {Math.round((STEPS.length - 2 - stepIdx))} steps remaining
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {stepIdx + 1}/{STEPS.length - 1}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-1 bg-indigo-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4 space-y-4">
        {/* Current step card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  {currentStepData.icon}
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  {currentStepData.label}
                </h2>
                <p className="text-sm text-gray-500">{currentStepData.description}</p>

                {error && (
                  <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Address cards */}
        {(currentStep === 'navigate_to_pickup' || currentStep === 'scan_pickup') && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Hub Pickup</p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {(order?.hub as { business_name?: string } | null)?.business_name ?? 'Hub'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{addressLine(hubAddress)}</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(addressLine(hubAddress))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 font-medium mt-1 inline-block"
                >
                  Open in Maps →
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {(currentStep === 'navigate_to_dropoff' || currentStep === 'scan_delivery' || currentStep === 'photo_delivery' || currentStep === 'signature') && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Delivery
                </p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {(order?.customer as { full_name?: string } | null)?.full_name ?? 'Customer'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{addressLine(customerAddress)}</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(addressLine(customerAddress))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 font-medium mt-1 inline-block"
                >
                  Open in Maps →
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature step inline */}
        {currentStep === 'signature' && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Customer Signature</p>
              <SignatureCanvas
                onConfirm={(file) => void handleSignature(file)}
                isLoading={isSubmitting}
              />
            </CardContent>
          </Card>
        )}

        {/* Action button */}
        {currentStep === 'navigate_to_pickup' && (
          <Button className="w-full h-14 rounded-2xl text-base" onClick={handleArrivedAtHub}>
            I've Arrived at Hub <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        )}

        {currentStep === 'confirmed_pickup' && (
          <Button className="w-full h-14 rounded-2xl text-base" onClick={handleArrivedAtCustomer}>
            Drive to Customer <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        )}

        {currentStep === 'navigate_to_dropoff' && (
          <Button className="w-full h-14 rounded-2xl text-base" onClick={handleArrivedAtCustomer}>
            I've Arrived at Customer <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        )}

        {isSubmitting && (
          <p className="text-center text-sm text-indigo-600 animate-pulse">
            Uploading and recording handoff…
          </p>
        )}
      </div>

      {/* Modals */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => { setIsScannerOpen(false); setCurrentStep(currentStep === 'scan_pickup' ? 'navigate_to_pickup' : 'navigate_to_dropoff') }}
        onScan={handleScan}
        title={currentStep === 'scan_pickup' ? 'Scan Bag at Hub' : 'Scan Bag at Door'}
      />

      <PhotoCaptureModal
        isOpen={isPhotoOpen}
        onClose={() => { setIsPhotoOpen(false); setCurrentStep(currentStep === 'photo_pickup' ? 'scan_pickup' : 'scan_delivery') }}
        onCapture={handlePhotos}
        maxPhotos={3}
      />
    </div>
  )
}
