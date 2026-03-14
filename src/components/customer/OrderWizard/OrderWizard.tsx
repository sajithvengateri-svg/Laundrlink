import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AddressStep } from './AddressStep'
import { ItemsStep } from './ItemsStep'
import { ServiceStep } from './ServiceStep'
import { ScheduleStep } from './ScheduleStep'
import { ConfirmStep } from './ConfirmStep'
import { useCreateOrder } from '@/hooks/useOrder'
import { fullOrderSchema, type OrderWizardData } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { setOrderOTP } from '@/services/otp.service'

const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// Only load Stripe in production mode
const stripePromise = IS_DEV_MODE
  ? null
  : import('@stripe/stripe-js').then((m) => m.loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string))

interface OrderWizardProps {
  onComplete: (orderId: string) => void
}

const STEPS = [
  { label: 'Address', component: AddressStep },
  { label: 'Items', component: ItemsStep },
  { label: 'Service', component: ServiceStep },
  { label: 'Schedule', component: ScheduleStep },
  { label: IS_DEV_MODE ? 'Confirm' : 'Confirm & Pay', component: ConfirmStep },
]

export function OrderWizard({ onComplete }: OrderWizardProps) {
  const [step, setStep] = useState(0)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [, setPickupOtp] = useState<string | null>(null)

  const methods = useForm<OrderWizardData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(fullOrderSchema) as any,
    defaultValues: {
      same_as_pickup: true,
      is_ndis: false,
      items: [],
    },
    mode: 'onChange',
  })

  const createOrder = useCreateOrder()

  const StepComponent = STEPS[step].component

  const canProceed = () => {
    // Basic per-step validation checks
    const values = methods.getValues()
    if (step === 0) return !!(values.pickup_address?.street && values.delivery_address?.street)
    if (step === 1) return (values.items?.length ?? 0) > 0
    if (step === 2) return !!values.service_type
    if (step === 3) return !!(values.pickup_date && values.delivery_date)
    return true
  }

  const handleDevModeComplete = async (orderId: string) => {
    // In dev mode: bypass Stripe, auto-set payment, auto-assign hub + bag
    try {
      // 1. Find first active hub
      const { data: hub } = await supabase
        .from('hubs')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single()

      // 2. Update order: mark as paid, assign hub, set status
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'pickup_scheduled',
          hub_id: hub?.id ?? null,
        })
        .eq('id', orderId)

      // 3. Find first unassigned bag and assign it
      const { data: bag } = await supabase
        .from('bags')
        .select('id')
        .is('current_order_id', null)
        .limit(1)
        .single()

      if (bag) {
        await supabase
          .from('bags')
          .update({
            current_order_id: orderId,
            current_status: 'in_transit_to_hub',
          })
          .eq('id', bag.id)
      }

      // Generate OTP codes for pickup and delivery
      const pOtp = await setOrderOTP(orderId, 'pickup')
      await setOrderOTP(orderId, 'delivery')
      setPickupOtp(pOtp)

      onComplete(orderId)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to finalize order')
      setIsSubmitting(false)
    }
  }

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }

    // Final step: create order
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const values = methods.getValues()

      // 1. Create order in DB
      const order = await createOrder.mutateAsync({
        pickupAddress: values.pickup_address,
        deliveryAddress: values.delivery_address,
        serviceType: values.service_type,
        items: values.items,
        pickupDate: values.pickup_date,
        deliveryDate: values.delivery_date,
        specialInstructions: values.special_instructions,
        isNdis: values.is_ndis,
        ndisNumber: values.ndis_number,
        ndisPlanManager: values.ndis_plan_manager,
      })

      setCreatedOrderId(order.id)

      if (IS_DEV_MODE) {
        // Dev mode: bypass payment, auto-assign hub + bag
        await handleDevModeComplete(order.id)
        return
      }

      // Production mode: proceed with Stripe payment
      // 2. Auto-assign hub if user didn't pick one
      if (!values.hub_id && values.pickup_address.lat && values.pickup_address.lng) {
        const { assignHubToOrder } = await import('@/services/payment.service')
        await assignHubToOrder(order.id, values.pickup_address.lat, values.pickup_address.lng)
      }

      // 3. Create Stripe payment intent
      const total = values.items.reduce(
        (sum, i) => sum + (i.price_cents ?? 0) * (i.quantity ?? 0),
        0
      )

      const { createPaymentIntent } = await import('@/services/payment.service')
      const piResult = await createPaymentIntent(order.id, total, '')
      setClientSecret(piResult.client_secret)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentSuccess = (paymentIntentId: string) => {
    if (createdOrderId) {
      onComplete(createdOrderId)
    }
    void paymentIntentId
  }

  // Show payment UI after order is created (production mode only)
  if (!IS_DEV_MODE && clientSecret && createdOrderId) {
    // Dynamically render Stripe Elements only in production
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Payment</h2>
          <p className="text-sm text-muted-foreground">Secure payment via Stripe</p>
        </div>
        <StripePaymentWrapper
          clientSecret={clientSecret}
          amountCents={methods.getValues().items.reduce(
            (sum, i) => sum + (i.price_cents ?? 0) * (i.quantity ?? 0),
            0
          )}
          onSuccess={handlePaymentSuccess}
          onError={setSubmitError}
        />
        {submitError && (
          <p className="text-sm text-brand-danger text-center">{submitError}</p>
        )}
      </div>
    )
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((s, i) => (
              <span
                key={s.label}
                className={i <= step ? 'text-brand-blue font-medium' : ''}
              >
                {s.label}
              </span>
            ))}
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <StepComponent />
          </motion.div>
        </AnimatePresence>

        {submitError && (
          <p className="text-sm text-brand-danger bg-red-50 rounded-lg p-3 text-center">
            {submitError}
          </p>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            type="button"
            onClick={() => void handleNext()}
            disabled={!canProceed() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              'Creating Order…'
            ) : step === STEPS.length - 1 ? (
              IS_DEV_MODE ? 'Place Order (Dev)' : 'Place Order'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </FormProvider>
  )
}

// Lazy-loaded Stripe wrapper — only used in production mode
function StripePaymentWrapper({
  clientSecret,
  amountCents,
  onSuccess,
  onError,
}: {
  clientSecret: string
  amountCents: number
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
}) {
  const [StripeComponents, setStripeComponents] = useState<{
    Elements: React.ComponentType<{ stripe: unknown; options: { clientSecret: string }; children: React.ReactNode }>
    PaymentForm: React.ComponentType<{ clientSecret: string; amountCents: number; onSuccess: (id: string) => void; onError: (err: string) => void }>
    stripe: unknown
  } | null>(null)

  // Load Stripe components dynamically
  useState(() => {
    void (async () => {
      const [{ Elements }, { PaymentForm }, stripe] = await Promise.all([
        import('@stripe/react-stripe-js'),
        import('@/components/customer/PaymentForm'),
        stripePromise!,
      ])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStripeComponents({ Elements: Elements as any, PaymentForm, stripe })
    })()
  })

  if (!StripeComponents) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading payment…</div>
  }

  const { Elements, PaymentForm, stripe } = StripeComponents

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Elements stripe={stripe as any} options={{ clientSecret }}>
      <PaymentForm
        clientSecret={clientSecret}
        amountCents={amountCents}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  )
}
