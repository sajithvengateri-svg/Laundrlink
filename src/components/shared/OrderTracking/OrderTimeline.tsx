import { motion } from 'framer-motion'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { formatRelative } from '@/lib/utils'
import type { OrderWithDetails } from '@/types/order.types'

interface OrderTimelineProps {
  order: OrderWithDetails
}

const TIMELINE_STEPS: Array<{ status: string; label: string; handoffStep?: string }> = [
  { status: 'pending', label: 'Order Placed' },
  { status: 'pickup_scheduled', label: 'Pickup Scheduled' },
  { status: 'picked_up_by_driver', label: 'Picked Up', handoffStep: 'customer_to_driver' },
  { status: 'at_hub', label: 'Arrived at Hub', handoffStep: 'driver_to_hub' },
  { status: 'with_pro', label: 'Being Washed', handoffStep: 'hub_to_pro' },
  { status: 'returned_to_hub', label: 'Ready for Delivery', handoffStep: 'pro_to_hub' },
  { status: 'out_for_delivery', label: 'Out for Delivery', handoffStep: 'hub_to_driver' },
  { status: 'delivered', label: 'Delivered', handoffStep: 'driver_to_customer' },
]

const STATUS_ORDER = TIMELINE_STEPS.map((s) => s.status)

function getStepIndex(status: string | null): number {
  const idx = STATUS_ORDER.indexOf(status ?? '')
  return idx === -1 ? 0 : idx
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const currentIdx = getStepIndex(order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="space-y-0 py-1">
      {TIMELINE_STEPS.map((step, i) => {
        const isDone = i <= currentIdx && !isCancelled
        const isCurrent = i === currentIdx && !isCancelled

        // Find matching handoff record for this step
        const handoff = order.handoffs?.find((h) => h.step === step.handoffStep)

        return (
          <motion.div
            key={step.status}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="flex items-start gap-3"
          >
            {/* Dot + connector */}
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              {isCurrent ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-3.5 h-3.5 rounded-full bg-brand-blue ring-4 ring-brand-blue/20"
                />
              ) : isDone ? (
                <CheckCircle className="w-3.5 h-3.5 text-brand-teal" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-gray-300" />
              )}
              {i < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`w-0.5 my-1 ${
                    isDone && i < currentIdx ? 'bg-brand-teal h-full min-h-[20px]' : 'bg-gray-200 h-full min-h-[20px]'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-3 flex-1 min-w-0">
              <p
                className={`text-sm leading-none mb-1 ${
                  isCurrent
                    ? 'font-semibold text-brand-blue'
                    : isDone
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {step.label}
                {isCurrent && (
                  <Loader2 className="inline-block ml-1.5 w-3 h-3 animate-spin text-brand-blue" />
                )}
              </p>

              {handoff && (
                <div className="mt-1 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    {handoff.created_at ? formatRelative(handoff.created_at) : ''}
                  </p>

                  {/* Handoff photos */}
                  {handoff.photo_urls && handoff.photo_urls.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {handoff.photo_urls.slice(0, 3).map((url, pi) => (
                        <img
                          key={pi}
                          src={url}
                          alt={`${step.label} photo ${pi + 1}`}
                          className="w-14 h-14 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )
      })}

      {isCancelled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3"
        >
          <div className="w-3.5 h-3.5 rounded-full bg-red-400 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-500">Order Cancelled</p>
        </motion.div>
      )}
    </div>
  )
}
