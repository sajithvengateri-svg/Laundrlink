import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Search, AlertCircle, Camera, QrCode, Keyboard, Hash } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QRScannerModal } from '@/components/shared/QRScanner/QRScannerModal'
import { OTPInput } from '@/components/shared/OTPInput'
import { getBagByQR } from '@/services/bag.service'
import { createHandoff } from '@/services/handoff.service'
import { findOrderByOTP, getVerificationMethods } from '@/services/otp.service'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { HandoffStep } from '@/types/hub.types'
import type { BagWithOrder } from '@/types/bag.types'

const DRIVER_STEPS: Array<{ step: HandoffStep; label: string; description: string }> = [
  { step: 'customer_to_driver', label: 'Pickup from Customer', description: 'Collect bag from customer' },
  { step: 'driver_to_hub', label: 'Drop at Hub', description: 'Drop bag at laundromat' },
  { step: 'driver_to_customer', label: 'Deliver to Customer', description: 'Deliver clean bag' },
  { step: 'hub_to_driver', label: 'Pickup from Hub', description: 'Collect bag from hub' },
]

const HANDOFF_SEQUENCE: HandoffStep[] = [
  'customer_to_driver', 'driver_to_hub', 'hub_to_pro',
  'pro_to_hub', 'hub_to_driver', 'driver_to_customer'
]

const STEP_LABELS: Record<HandoffStep, { short: string; arrow: string }> = {
  customer_to_driver: { short: 'Pickup', arrow: 'Customer \u2192 Driver' },
  driver_to_hub: { short: 'Drop-off', arrow: 'Driver \u2192 Hub' },
  hub_to_pro: { short: 'Processing', arrow: 'Hub \u2192 Pro' },
  pro_to_hub: { short: 'Return', arrow: 'Pro \u2192 Hub' },
  hub_to_driver: { short: 'Dispatch', arrow: 'Hub \u2192 Driver' },
  driver_to_customer: { short: 'Delivery', arrow: 'Driver \u2192 Customer' },
}

type VerifyTab = 'qr' | 'otp' | 'manual'
type ScanState = 'select_step' | 'verify' | 'looking_up' | 'bag_found' | 'confirming' | 'success' | 'error'

const TAB_META: Record<VerifyTab, { label: string; icon: typeof QrCode }> = {
  qr: { label: 'QR Scan', icon: Camera },
  otp: { label: 'OTP Code', icon: Keyboard },
  manual: { label: 'Bag Code', icon: Hash },
}

export function DriverScanPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const driverId = profile?.id ?? ''

  const [scanState, setScanState] = useState<ScanState>('select_step')
  const [selectedStep, setSelectedStep] = useState<HandoffStep | null>(null)
  const [activeTab, setActiveTab] = useState<VerifyTab>('qr')
  const [availableTabs, setAvailableTabs] = useState<VerifyTab[]>(['qr', 'otp', 'manual'])
  const [bagCode, setBagCode] = useState('')
  const [scannedBag, setScannedBag] = useState<BagWithOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)

  // Load available verification methods on mount (no hubId for driver)
  useEffect(() => {
    let cancelled = false
    getVerificationMethods().then((methods) => {
      if (cancelled) return
      const tabs = methods.filter((m): m is VerifyTab => ['qr', 'otp', 'manual'].includes(m))
      if (tabs.length > 0) {
        setAvailableTabs(tabs)
        setActiveTab(tabs[0])
      }
    }).catch(() => {
      // Keep defaults on error
    })
    return () => { cancelled = true }
  }, [])

  const handleSelectStep = (step: HandoffStep) => {
    setSelectedStep(step)
    setError(null)
    setBagCode('')
    setScannedBag(null)
    setScanState('verify')
    // Open QR scanner immediately if qr tab is active
    if (activeTab === 'qr') {
      setShowScanner(true)
    }
  }

  const lookUpBag = async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    setScanState('looking_up')
    setError(null)
    try {
      const bag = await getBagByQR(trimmed)
      if (!bag) {
        setError(`Bag not found: ${trimmed}`)
        setScanState('error')
        return
      }
      if (!bag.current_order_id) {
        setError(`Bag "${trimmed}" is not assigned to any active order.`)
        setScanState('error')
        return
      }
      setScannedBag(bag)
      setScanState('bag_found')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Lookup failed'
      setError(message)
      setScanState('error')
    }
  }

  const handleOTPComplete = async (otp: string) => {
    setOtpLoading(true)
    setScanState('looking_up')
    setError(null)
    try {
      const result = await findOrderByOTP(otp)
      if (!result) {
        setError('No active order found for this OTP code.')
        setScanState('error')
        setOtpLoading(false)
        return
      }
      // Query bags for this order (plain .eq(), no FK joins)
      const { data: bags, error: bagError } = await supabase
        .from('bags')
        .select('*')
        .eq('current_order_id', result.orderId)
        .limit(1)

      if (bagError) throw new Error(bagError.message)
      if (!bags || bags.length === 0) {
        setError('No bags found for this order.')
        setScanState('error')
        setOtpLoading(false)
        return
      }

      const bag = bags[0] as BagWithOrder
      // Fetch order details separately (no FK join)
      const { data: order } = await supabase
        .from('orders')
        .select('id, order_number, status')
        .eq('id', result.orderId)
        .single()

      if (order) {
        bag.order = { order_number: order.order_number, customer: undefined } as BagWithOrder['order']
      }

      setScannedBag(bag)
      setScanState('bag_found')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OTP lookup failed'
      setError(message)
      setScanState('error')
    } finally {
      setOtpLoading(false)
    }
  }

  const confirmHandoff = async () => {
    if (!scannedBag || !selectedStep) return
    setScanState('confirming')
    setError(null)

    try {
      const orderId = scannedBag.current_order_id
      if (!orderId) throw new Error('No active order associated with this bag')

      await createHandoff({
        orderId,
        bagId: scannedBag.id,
        step: selectedStep,
        fromUserId: scannedBag.current_holder_id ?? driverId,
        toUserId: driverId,
        scannedById: driverId,
        photoUrls: [],
      })

      setScanState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record handoff')
      setScanState('error')
    }
  }

  const getNextStepHint = (): string | null => {
    if (!selectedStep) return null
    const idx = HANDOFF_SEQUENCE.indexOf(selectedStep)
    if (idx < 0 || idx >= HANDOFF_SEQUENCE.length - 1) return null
    const nextStep = HANDOFF_SEQUENCE[idx + 1]
    return STEP_LABELS[nextStep]?.arrow ?? null
  }

  const getStepPosition = (): string | null => {
    if (!selectedStep) return null
    const idx = HANDOFF_SEQUENCE.indexOf(selectedStep)
    if (idx < 0) return null
    return `${idx + 1}/${HANDOFF_SEQUENCE.length}`
  }

  const reset = () => {
    setSelectedStep(null)
    setScannedBag(null)
    setBagCode('')
    setError(null)
    setOtpLoading(false)
    setScanState('select_step')
  }

  const backToVerify = () => {
    setScannedBag(null)
    setBagCode('')
    setError(null)
    setOtpLoading(false)
    setScanState('verify')
  }

  const handleTabChange = (tab: VerifyTab) => {
    setActiveTab(tab)
    setBagCode('')
    setError(null)
    if (tab === 'qr') {
      setShowScanner(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => {
            if (scanState === 'select_step') {
              navigate('/driver')
            } else if (scanState === 'verify') {
              reset()
            } else {
              backToVerify()
            }
          }}
          className="p-1"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <p className="font-semibold text-gray-900">
          {selectedStep
            ? DRIVER_STEPS.find((s) => s.step === selectedStep)?.label ?? 'Scan'
            : 'Driver Scan'}
        </p>
      </div>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {/* ── Step selection ── */}
        {scanState === 'select_step' && (
          <>
            <p className="text-sm text-gray-500 px-1">Select the type of handoff to record:</p>
            {DRIVER_STEPS.map(({ step, label, description }) => (
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

        {/* ── Verify: three-tab selector ── */}
        {scanState === 'verify' && (
          <div className="space-y-4 pt-2">
            {/* Tab bar */}
            <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
              {availableTabs.map((tab) => {
                const meta = TAB_META[tab]
                const Icon = meta.icon
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={[
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </button>
                )
              })}
            </div>

            {/* QR Scan tab content */}
            {activeTab === 'qr' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                  <QrCode className="h-10 w-10 text-blue-500" />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Tap below to open the camera and scan the bag QR code.
                </p>
                <Button
                  onClick={() => setShowScanner(true)}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Open Camera
                </Button>
              </div>
            )}

            {/* OTP Code tab content */}
            {activeTab === 'otp' && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-gray-500 text-center">
                  Enter the 4-digit OTP from the customer.
                </p>
                <OTPInput
                  onComplete={(code) => void handleOTPComplete(code)}
                  disabled={otpLoading}
                />
                {otpLoading && (
                  <p className="text-sm text-center text-muted-foreground">Looking up order...</p>
                )}
              </div>
            )}

            {/* Bag Code tab content */}
            {activeTab === 'manual' && (
              <div className="space-y-4">
                <Input
                  className="h-14 text-lg font-mono text-center border-2 border-gray-300 focus:border-brand-blue"
                  placeholder="Type bag code e.g. LL-BAG-001"
                  value={bagCode}
                  onChange={(e) => setBagCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && void lookUpBag(bagCode)}
                  autoFocus
                />
                <Button
                  onClick={() => void lookUpBag(bagCode)}
                  disabled={!bagCode.trim()}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Look Up Bag
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Looking up ── */}
        {scanState === 'looking_up' && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-10 w-10 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Looking up bag...</p>
          </div>
        )}

        {/* ── Bag found ── */}
        {scanState === 'bag_found' && scannedBag && (
          <div className="space-y-4 pt-2">
            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xl font-mono">{scannedBag.qr_code}</p>
                  <Badge variant="secondary" className="capitalize">
                    {scannedBag.current_status?.replace(/_/g, ' ') ?? 'unknown'}
                  </Badge>
                </div>
                {scannedBag.order && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Order: <span className="font-medium text-foreground">{scannedBag.order.order_number}</span></p>
                    {scannedBag.order.customer?.full_name && (
                      <p>Customer: <span className="font-medium text-foreground">{scannedBag.order.customer.full_name}</span></p>
                    )}
                  </div>
                )}
                {selectedStep && (
                  <p className="text-sm font-medium text-brand-blue pt-1">
                    Step: {STEP_LABELS[selectedStep].arrow}
                  </p>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={() => void confirmHandoff()}
              className="w-full h-12 text-base"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Confirm Handoff
            </Button>
            <Button variant="ghost" size="sm" onClick={backToVerify} className="w-full">
              Cancel
            </Button>
          </div>
        )}

        {/* ── Confirming ── */}
        {scanState === 'confirming' && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-10 w-10 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Recording handoff...</p>
          </div>
        )}

        {/* ── Success ── */}
        {scanState === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="font-semibold text-gray-900 text-lg mb-1">Handoff Recorded</p>
            {scannedBag && (
              <p className="text-gray-700 font-mono font-medium mb-1">{scannedBag.qr_code}</p>
            )}
            {selectedStep && (
              <p className="text-gray-500 text-sm mb-1">
                {STEP_LABELS[selectedStep].arrow} ({getStepPosition()})
              </p>
            )}
            {getNextStepHint() && (
              <p className="text-xs text-gray-400 mb-6">
                Next step: {getNextStepHint()}
              </p>
            )}
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button className="w-full" onClick={() => {
                setScannedBag(null)
                setBagCode('')
                setError(null)
                setOtpLoading(false)
                setScanState('verify')
              }}>
                Scan Next Bag
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/driver')}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {scanState === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <Button variant="outline" onClick={backToVerify}>Try Again</Button>
          </div>
        )}
      </div>

      {/* Camera scanner modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => {
          setShowScanner(false)
          setBagCode(code)
          void lookUpBag(code)
        }}
        title={DRIVER_STEPS.find((s) => s.step === selectedStep)?.label ?? 'Scan Bag'}
      />
    </div>
  )
}
