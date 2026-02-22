import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Lock } from 'lucide-react'
import { formatCents } from '@/lib/utils'

interface PaymentFormProps {
  clientSecret: string
  amountCents: number
  onSuccess: (paymentIntentId: string) => void
  onError?: (error: string) => void
}

export function PaymentForm({ amountCents, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardholderName, setCardholderName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    setErrorMsg(null)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: {
          billing_details: { name: cardholderName },
        },
        return_url: window.location.href,
      },
      redirect: 'if_required',
    })

    setIsProcessing(false)

    if (error) {
      const msg = error.message ?? 'Payment failed. Please try again.'
      setErrorMsg(msg)
      onError?.(msg)
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardholder">Name on card</Label>
        <Input
          id="cardholder"
          placeholder="Jane Smith"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          required
        />
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />

      {errorMsg && (
        <p className="text-sm text-brand-danger bg-red-50 rounded-lg p-3">{errorMsg}</p>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing || !cardholderName.trim()}
        className="w-full"
        size="lg"
      >
        <Lock className="h-4 w-4 mr-2" />
        {isProcessing ? 'Processing…' : `Pay ${formatCents(amountCents)}`}
      </Button>

      <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        Secured by Stripe · AUD {(amountCents / 100).toFixed(2)}
      </p>
    </form>
  )
}
