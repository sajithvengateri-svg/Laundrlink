import { useFormContext } from 'react-hook-form'
import { Autocomplete } from '@react-google-maps/api'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MapPin, Copy } from 'lucide-react'
import type { OrderWizardData } from '@/lib/validations'

export function AddressStep() {
  const { setValue, watch, register, formState: { errors } } = useFormContext<OrderWizardData>()
  const [pickupAuto, setPickupAuto] = useState<google.maps.places.Autocomplete | null>(null)
  const [deliveryAuto, setDeliveryAuto] = useState<google.maps.places.Autocomplete | null>(null)
  const sameAsPickup = watch('same_as_pickup')

  const handlePickupSelect = () => {
    if (!pickupAuto) return
    const place = pickupAuto.getPlace()
    if (!place.formatted_address) return

    const comps = place.address_components ?? []
    const get = (type: string) =>
      comps.find((c) => c.types.includes(type))?.long_name ?? ''

    const addr = {
      street: `${get('street_number')} ${get('route')}`.trim(),
      suburb: get('locality') || get('sublocality'),
      state: get('administrative_area_level_1'),
      postcode: get('postal_code'),
      country: 'Australia',
      lat: place.geometry?.location?.lat(),
      lng: place.geometry?.location?.lng(),
      formatted: place.formatted_address,
    }

    setValue('pickup_address', addr, { shouldValidate: true })
    if (sameAsPickup) {
      setValue('delivery_address', addr, { shouldValidate: true })
    }
  }

  const handleDeliverySelect = () => {
    if (!deliveryAuto) return
    const place = deliveryAuto.getPlace()
    if (!place.formatted_address) return

    const comps = place.address_components ?? []
    const get = (type: string) =>
      comps.find((c) => c.types.includes(type))?.long_name ?? ''

    setValue('delivery_address', {
      street: `${get('street_number')} ${get('route')}`.trim(),
      suburb: get('locality') || get('sublocality'),
      state: get('administrative_area_level_1'),
      postcode: get('postal_code'),
      country: 'Australia',
      lat: place.geometry?.location?.lat(),
      lng: place.geometry?.location?.lng(),
      formatted: place.formatted_address,
    }, { shouldValidate: true })
  }

  const copyPickupToDelivery = () => {
    const pickup = watch('pickup_address')
    if (pickup) {
      setValue('delivery_address', pickup, { shouldValidate: true })
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-blue" />
          Pickup Address
        </Label>
        <Autocomplete
          onLoad={setPickupAuto}
          onPlaceChanged={handlePickupSelect}
          options={{
            componentRestrictions: { country: 'au' },
            fields: ['formatted_address', 'address_components', 'geometry'],
          }}
        >
          <Input
            placeholder="Start typing your pickup address…"
            className={errors.pickup_address?.street ? 'border-brand-danger' : ''}
          />
        </Autocomplete>
        {errors.pickup_address?.street && (
          <p className="text-xs text-brand-danger">{errors.pickup_address.street.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-teal" />
            Delivery Address
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copyPickupToDelivery}
            className="text-xs h-7"
          >
            <Copy className="h-3 w-3 mr-1" />
            Same as pickup
          </Button>
        </div>
        <Autocomplete
          onLoad={setDeliveryAuto}
          onPlaceChanged={handleDeliverySelect}
          options={{
            componentRestrictions: { country: 'au' },
            fields: ['formatted_address', 'address_components', 'geometry'],
          }}
        >
          <Input
            placeholder="Start typing your delivery address…"
            className={errors.delivery_address?.street ? 'border-brand-danger' : ''}
          />
        </Autocomplete>
        {errors.delivery_address?.street && (
          <p className="text-xs text-brand-danger">{errors.delivery_address.street.message}</p>
        )}
      </div>

      {/* Hidden fields for form state */}
      <input type="hidden" {...register('same_as_pickup')} />
    </div>
  )
}
