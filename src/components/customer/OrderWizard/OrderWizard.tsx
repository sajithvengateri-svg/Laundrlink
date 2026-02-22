import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AddressStep } from './AddressStep'
import { ItemsStep } from './ItemsStep'
import { ServiceStep } from './ServiceStep'
import { ScheduleStep } from './ScheduleStep'
import { ConfirmStep } from './ConfirmStep'
import { PaymentForm } from '@/components/customer/PaymentForm'
import { useCreateOrder } from '@/hooks/useOrder'
import { createPaymentIntent, assignHubToOrder } from '@/services/payment.service'
import { fullOrderSchema, type OrderWizardData } from '@/lib/validations'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)

interface OrderWizardProps {
  onComplete: (orderId: string) => void
}

const STEPS = [
  { label: 'Address', component: AddressStep },
  { label: 'Items', component: ItemsStep },
  { label: 'Service', component: ServiceStep },
  { label: 'Schedule', component: ScheduleStep },
  { label: 'Confirm & Pay', component: ConfirmStep },
]

export function OrderWizard({ onComplete }: OrderWizardProps) {
  const [step, setStep] = useState(0)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const methods = useForm<OrderWizardData>({
    resolver: zodResolver(fullOrderSchema),
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

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }

    // Final step: create order + payment intent
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

      // 2. Auto-assign hub if user didn't pick one
      if (!values.hub_id && values.pickup_address.lat && values.pickup_address.lng) {
        await assignHubToOrder(order.id, values.pickup_address.lat, values.pickup_address.lng)
      }

      // 3. Create Stripe payment intent
      const total = values.items.reduce(
        (sum, i) => sum + (i.price_cents ?? 0) * (i.quantity ?? 0),
        0
      )

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

  // Show payment UI after order is created
  if (clientSecret && createdOrderId) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Payment</h2>
          <p className="text-sm text-muted-foreground">Secure payment via Stripe</p>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm
            clientSecret={clientSecret}
            amountCents={
              methods.getValues().items.reduce(
                (sum, i) => sum + (i.price_cents ?? 0) * (i.quantity ?? 0),
                0
              )
            }
            onSuccess={handlePaymentSuccess}
            onError={setSubmitError}
          />
        </Elements>
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
              'Place Order'
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
