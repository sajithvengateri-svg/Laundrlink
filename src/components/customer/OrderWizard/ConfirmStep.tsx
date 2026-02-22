import { useFormContext } from 'react-hook-form'
import { MapPin, Calendar, Package, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import type { OrderWizardData } from '@/lib/validations'

const SERVICE_LABELS: Record<string, string> = {
  wash_fold: 'Wash & Fold',
  wash_iron: 'Wash & Iron',
  dry_clean: 'Dry Clean',
  ironing: 'Ironing Only',
  express: 'Express (24h)',
}

export function ConfirmStep() {
  const { watch } = useFormContext<OrderWizardData>()
  const data = watch()

  const total = (data.items ?? []).reduce(
    (sum, i) => sum + (i.price_cents ?? 0) * (i.quantity ?? 0),
    0
  )
  const platformFee = Math.round(total * 0.3)

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Review Your Order</h3>

      {/* Addresses */}
      <Card>
        <CardContent className="py-3 space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-brand-blue mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium">
                {data.pickup_address?.formatted ?? `${data.pickup_address?.street}, ${data.pickup_address?.suburb}`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-brand-teal mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Delivery</p>
              <p className="text-sm font-medium">
                {data.delivery_address?.formatted ?? `${data.delivery_address?.street}, ${data.delivery_address?.suburb}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardContent className="py-3 flex gap-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-blue" />
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium">{data.pickup_date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-teal" />
            <div>
              <p className="text-xs text-muted-foreground">Delivery</p>
              <p className="text-sm font-medium">{data.delivery_date}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service */}
      <Card>
        <CardContent className="py-3 flex items-center gap-3">
          <Star className="h-4 w-4 text-brand-amber" />
          <div>
            <p className="text-xs text-muted-foreground">Service</p>
            <p className="text-sm font-medium">{SERVICE_LABELS[data.service_type ?? ''] ?? data.service_type}</p>
          </div>
          {data.is_ndis && (
            <Badge variant="secondary" className="ml-auto text-xs">NDIS</Badge>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardContent className="py-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Items</p>
          </div>
          {(data.items ?? []).map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.quantity}× {item.description}
              </span>
              <span>{formatCents(item.price_cents * item.quantity)}</span>
            </div>
          ))}
          {data.special_instructions && (
            <p className="text-xs text-muted-foreground italic mt-1">
              Note: {data.special_instructions}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pricing breakdown */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCents(total)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Platform fee (30%)</span>
          <span>{formatCents(platformFee)}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t pt-2">
          <span>Total</span>
          <span className="text-brand-blue">{formatCents(total)}</span>
        </div>
      </div>
    </div>
  )
}
