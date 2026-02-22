import { useFormContext } from 'react-hook-form'
import { Calendar } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { getNearbyHubs } from '@/services/order.service'
import { useQuery } from '@tanstack/react-query'
import { HubMap } from '@/components/customer/HubMap'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrderWizardData } from '@/lib/validations'
import type { NearbyHub } from '@/types/order.types'

// Earliest pickup date is tomorrow
function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export function ScheduleStep() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OrderWizardData>()
  const pickupAddress = watch('pickup_address')
  const selectedHubId = watch('hub_id')

  const lat = pickupAddress?.lat
  const lng = pickupAddress?.lng

  const { data: hubs } = useQuery({
    queryKey: ['nearbyHubs', lat, lng],
    queryFn: () => getNearbyHubs(lat!, lng!),
    enabled: !!(lat && lng),
    staleTime: 5 * 60 * 1000,
  })

  const handleHubSelect = (hub: NearbyHub) => {
    setValue('hub_id', hub.id, { shouldValidate: true })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="pickup_date" className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Pickup Date
          </Label>
          <Input
            id="pickup_date"
            type="date"
            min={getMinDate()}
            {...register('pickup_date')}
            className={errors.pickup_date ? 'border-brand-danger' : ''}
          />
          {errors.pickup_date && (
            <p className="text-xs text-brand-danger">{errors.pickup_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="delivery_date" className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Delivery Date
          </Label>
          <Input
            id="delivery_date"
            type="date"
            min={getMinDate()}
            {...register('delivery_date')}
            className={errors.delivery_date ? 'border-brand-danger' : ''}
          />
          {errors.delivery_date && (
            <p className="text-xs text-brand-danger">{errors.delivery_date.message}</p>
          )}
        </div>
      </div>

      {hubs && hubs.length > 0 && (
        <div className="space-y-3">
          <Label>Select Hub</Label>

          {lat && lng && (
            <HubMap
              hubs={hubs}
              selectedHubId={selectedHubId}
              onHubSelect={handleHubSelect}
              centerLat={lat}
              centerLng={lng}
              className="h-48"
            />
          )}

          <div className="space-y-2">
            {hubs.map((hub) => (
              <Card
                key={hub.id}
                className={cn(
                  'cursor-pointer transition-all',
                  selectedHubId === hub.id
                    ? 'border-brand-blue ring-1 ring-brand-blue'
                    : 'hover:border-gray-300'
                )}
                onClick={() => handleHubSelect(hub)}
              >
                <CardContent className="py-2.5 px-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{hub.business_name}</p>
                    {hub.distance_km > 0 && (
                      <p className="text-xs text-muted-foreground">{hub.distance_km.toFixed(1)} km away</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hub.rating && (
                      <span className="flex items-center gap-0.5 text-xs">
                        <Star className="h-3 w-3 fill-brand-amber text-brand-amber" />
                        {hub.rating.toFixed(1)}
                      </span>
                    )}
                    <Badge
                      variant={hub.available_capacity_pct > 0.2 ? 'success' : 'warning'}
                      className="text-xs"
                    >
                      {Math.round(hub.available_capacity_pct * 100)}% free
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {hubs?.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hubs found near your pickup address. We'll assign the nearest available hub automatically.
        </p>
      )}
    </div>
  )
}
