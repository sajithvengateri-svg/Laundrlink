import { useState, useEffect } from 'react'
import { Search, AlertCircle, CheckCircle, Camera, QrCode, Keyboard, Hash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
import type { BagWithOrder } from '@/types/bag.types'
import type { HandoffStep } from '@/types/hub.types'

interface BagScannerProps {
  hubId: string
  step: HandoffStep
  toUserId: string
  onComplete?: () => void
  onNextStep?: (nextStep: HandoffStep) => void
}

type ScanPhase = 'idle' | 'looking_up' | 'bag_found' | 'confirming' | 'done' | 'error'
type InputTab = 'qr' | 'otp' | 'bag'

const HANDOFF_SEQUENCE: HandoffStep[] = [
  'customer_to_driver',
  'driver_to_hub',
  'hub_to_pro',
  'pro_to_hub',
  'hub_to_driver',
  'driver_to_customer',
]

const STEP_LABELS: Record<HandoffStep, { short: string; arrow: string }> = {
  customer_to_driver: { short: 'Pickup', arrow: 'Customer → Driver' },
  driver_to_hub: { short: 'Drop-off', arrow: 'Driver → Hub' },
  hub_to_pro: { short: 'Processing', arrow: 'Hub → Pro' },
  pro_to_hub: { short: 'Return', arrow: 'Pro → Hub' },
  hub_to_driver: { short: 'Dispatch', arrow: 'Hub → Driver' },
  driver_to_customer: { short: 'Delivery', arrow: 'Driver → Customer' },
}

export function BagScanner({ hubId, step, toUserId, onComplete, onNextStep }: BagScannerProps) {
  const profile = useAuthStore((s) => s.profile)
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [activeTab, setActiveTab] = useState<InputTab>('qr')
  const [bagCode, setBagCode] = useState('')
  const [bag, setBag] = useState<BagWithOrder | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [availableTabs, setAvailableTabs] = useState<InputTab[]>(['qr', 'otp', 'bag'])

  // Fetch verification methods on mount
  useEffect(() => {
    let cancelled = false
    const loadMethods = async () => {
      try {
        const methods = await getVerificationMethods(hubId)
        if (cancelled) return
        const tabs: InputTab[] = []
        if (methods.includes('qr')) tabs.push('qr')
        if (methods.includes('otp')) tabs.push('otp')
        if (methods.includes('bag')) tabs.push('bag')
        if (tabs.length > 0) {
          setAvailableTabs(tabs)
          setActiveTab(tabs[0])
        }
      } catch {
        // Default to all tabs on error
      }
    }
    void loadMethods()
    return () => { cancelled = true }
  }, [hubId])

  const getNextStep = (): HandoffStep | null => {
    const currentIndex = HANDOFF_SEQUENCE.indexOf(step)
    if (currentIndex === -1 || currentIndex >= HANDOFF_SEQUENCE.length - 1) return null
    return HANDOFF_SEQUENCE[currentIndex + 1]
  }

  const getStepPosition = (): string => {
    const currentIndex = HANDOFF_SEQUENCE.indexOf(step)
    return `${currentIndex + 1}/${HANDOFF_SEQUENCE.length}`
  }

  const lookUpBag = async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    setPhase('looking_up')
    setErrorMsg(null)
    try {
      const foundBag = await getBagByQR(trimmed)
      if (!foundBag) {
        setErrorMsg(`Bag "${trimmed}" not found in the system.`)
        setPhase('error')
        return
      }
      if (!foundBag.current_order_id) {
        setErrorMsg(`Bag "${trimmed}" is not assigned to any active order.`)
        setPhase('error')
        return
      }
      setBag(foundBag)
      setPhase('bag_found')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Failed to look up bag'
      setErrorMsg(message)
      setPhase('error')
    }
  }

  const lookUpByOTP = async (otp: string) => {
    if (otp.length !== 4) return
    setPhase('looking_up')
    setErrorMsg(null)
    try {
      const order = await findOrderByOTP(otp)
      if (!order) {
        setErrorMsg('No order found for this OTP code.')
        setPhase('error')
        return
      }

      const { data: foundBag, error } = await supabase
        .from('bags')
        .select('*')
        .eq('current_order_id', order.orderId)
        .limit(1)
        .single()

      if (error || !foundBag) {
        setErrorMsg('No bag found for this order.')
        setPhase('error')
        return
      }

      setBag(foundBag as BagWithOrder)
      setPhase('bag_found')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Failed to look up by OTP'
      setErrorMsg(message)
      setPhase('error')
    }
  }

  const confirmHandoff = async () => {
    if (!bag || !bag.current_order_id || !profile) return
    setPhase('confirming')
    try {
      await createHandoff({
        orderId: bag.current_order_id,
        bagId: bag.id,
        step,
        fromUserId: bag.current_holder_id ?? profile.id,
        toUserId: toUserId || profile.id,
        scannedById: profile.id,
        photoUrls: [],
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
    setBagCode('')
    setErrorMsg(null)
  }

  const tabConfig: Record<InputTab, { label: string; icon: React.ReactNode }> = {
    qr: { label: 'QR Scan', icon: <Camera className="h-4 w-4" /> },
    otp: { label: 'OTP Code', icon: <Keyboard className="h-4 w-4" /> },
    bag: { label: 'Bag Code', icon: <Hash className="h-4 w-4" /> },
  }

  const nextStep = getNextStep()

  return (
    <div className="flex flex-col gap-4 py-4">
      <AnimatePresence mode="wait">
        {/* ── IDLE: tab selector + input ── */}
        {phase === 'idle' && (
          <motion.div
            key="idle"
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Tab Selector */}
            <div className="flex rounded-lg border bg-muted p-1 gap-1">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tabConfig[tab].icon}
                  {tabConfig[tab].label}
                </button>
              ))}
            </div>

            {/* QR Scan Tab */}
            {activeTab === 'qr' && (
              <motion.div
                key="tab-qr"
                className="space-y-4"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-20 h-20 rounded-2xl bg-brand-blue/10 flex items-center justify-center">
                    <QrCode className="h-10 w-10 text-brand-blue" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Scan the QR code on the bag tag
                  </p>
                </div>
                <Button
                  onClick={() => setShowScanner(true)}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Open Camera Scanner
                </Button>
              </motion.div>
            )}

            {/* OTP Code Tab */}
            {activeTab === 'otp' && (
              <motion.div
                key="tab-otp"
                className="space-y-4"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Enter the 4-digit OTP shared by the customer
                  </p>
                  <OTPInput
                    onComplete={(otp: string) => void lookUpByOTP(otp)}
                  />
                </div>
              </motion.div>
            )}

            {/* Bag Code Tab */}
            {activeTab === 'bag' && (
              <motion.div
                key="tab-bag"
                className="space-y-4"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
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
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── LOOKING UP ── */}
        {phase === 'looking_up' && (
          <motion.div
            key="looking_up"
            className="flex flex-col items-center gap-3 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="h-10 w-10 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Looking up bag…</p>
          </motion.div>
        )}

        {/* ── BAG FOUND: details + confirm ── */}
        {phase === 'bag_found' && bag && (
          <motion.div
            key="bag_found"
            className="space-y-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 border">
              <div className="flex items-center justify-between">
                <p className="font-bold text-xl font-mono">{bag.qr_code}</p>
                <Badge variant="secondary" className="capitalize">
                  {bag.current_status?.replace(/_/g, ' ') ?? 'unknown'}
                </Badge>
              </div>
              {bag.order && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Order: <span className="font-medium text-foreground">{bag.order.order_number}</span></p>
                  {bag.order.customer?.full_name && (
                    <p>Customer: <span className="font-medium text-foreground">{bag.order.customer.full_name}</span></p>
                  )}
                </div>
              )}
              <p className="text-sm font-medium text-brand-blue pt-1">
                Step: {STEP_LABELS[step].arrow} ({getStepPosition()})
              </p>
            </div>

            <Button
              onClick={() => void confirmHandoff()}
              className="w-full h-12 text-base"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Confirm Handoff
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} className="w-full">
              Cancel
            </Button>
          </motion.div>
        )}

        {/* ── CONFIRMING ── */}
        {phase === 'confirming' && (
          <motion.div
            key="confirming"
            className="flex flex-col items-center gap-3 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="h-10 w-10 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Recording handoff…</p>
          </motion.div>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && (
          <motion.div
            key="done"
            className="flex flex-col items-center gap-4 py-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-16 h-16 rounded-full bg-brand-teal/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-brand-teal" />
            </div>
            <p className="font-semibold text-brand-teal text-lg">Handoff Complete</p>
            {bag && (
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Handoff Complete — Bag {bag.qr_code}
                </p>
                <p className="text-sm text-muted-foreground">
                  Step: {STEP_LABELS[step].arrow} ({getStepPosition()})
                </p>
                {nextStep && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Next: {STEP_LABELS[nextStep].short} ({STEP_LABELS[nextStep].arrow})
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2 w-full mt-2">
              {nextStep && onNextStep && (
                <Button
                  onClick={() => {
                    reset()
                    onNextStep(nextStep)
                  }}
                  className="flex-1 h-11"
                >
                  Scan Next Step
                </Button>
              )}
              <Button
                variant="outline"
                onClick={reset}
                className="flex-1 h-11"
              >
                Done
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <motion.div
            key="error"
            className="flex flex-col items-center gap-3 py-8"
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

      {/* Camera scanner modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => {
          setShowScanner(false)
          setBagCode(code)
          void lookUpBag(code)
        }}
        title="Scan Bag"
        hint="Point at the QR code on the bag tag"
      />
    </div>
  )
}
