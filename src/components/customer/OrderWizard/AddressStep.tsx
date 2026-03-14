import { useFormContext } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MapPin, Copy } from 'lucide-react'
import type { OrderWizardData } from '@/lib/validations'

const DEFAULT_ADDRESS = {
  street: '123 Test Street',
  suburb: 'Sydney',
  state: 'NSW',
  postcode: '2000',
  country: 'Australia',
  lat: -33.8688,
  lng: 151.2093,
  formatted: '123 Test Street, Sydney, NSW 2000',
}

export function AddressStep() {
  const { setValue, watch, formState: { errors } } = useFormContext<OrderWizardData>()
  const [sameAsPickup, setSameAsPickup] = useState(true)

  const pickupAddress = watch('pickup_address')

  // Pre-fill with default address on mount
  useEffect(() => {
    if (!pickupAddress?.street) {
      setValue('pickup_address', DEFAULT_ADDRESS, { shouldValidate: true })
      setValue('delivery_address', DEFAULT_ADDRESS, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePickupChange = (field: string, value: string) => {
    const current = pickupAddress ?? DEFAULT_ADDRESS
    const updated = { ...current, [field]: value, formatted: '' }
    updated.formatted = `${updated.street}, ${updated.suburb}, ${updated.state} ${updated.postcode}`
    setValue('pickup_address', updated, { shouldValidate: true })

    if (sameAsPickup) {
      setValue('delivery_address', updated, { shouldValidate: true })
    }
  }

  const deliveryAddress = watch('delivery_address')

  const handleDeliveryChange = (field: string, value: string) => {
    const current = deliveryAddress ?? DEFAULT_ADDRESS
    const updated = { ...current, [field]: value, formatted: '' }
    updated.formatted = `${updated.street}, ${updated.suburb}, ${updated.state} ${updated.postcode}`
    setValue('delivery_address', updated, { shouldValidate: true })
  }

  const copyPickupToDelivery = () => {
    if (pickupAddress) {
      setValue('delivery_address', pickupAddress, { shouldValidate: true })
    }
  }

  const handleSameAsPickupToggle = () => {
    const next = !sameAsPickup
    setSameAsPickup(next)
    if (next && pickupAddress) {
      setValue('delivery_address', pickupAddress, { shouldValidate: true })
    }
  }

  return (
    <div className="space-y-6">
      {/* Pickup Address */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-blue" />
          Pickup Address
        </Label>
        <Input
          placeholder="Street address"
          value={pickupAddress?.street ?? ''}
          onChange={(e) => handlePickupChange('street', e.target.value)}
          className={errors.pickup_address?.street ? 'border-brand-danger' : ''}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="Suburb"
            value={pickupAddress?.suburb ?? ''}
            onChange={(e) => handlePickupChange('suburb', e.target.value)}
          />
          <Input
            placeholder="State"
            value={pickupAddress?.state ?? ''}
            onChange={(e) => handlePickupChange('state', e.target.value)}
          />
          <Input
            placeholder="Postcode"
            value={pickupAddress?.postcode ?? ''}
            onChange={(e) => handlePickupChange('postcode', e.target.value)}
          />
        </div>
        {errors.pickup_address?.street && (
          <p className="text-xs text-brand-danger">{errors.pickup_address.street.message}</p>
        )}
      </div>

      {/* Same as Pickup checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={sameAsPickup}
          onChange={handleSameAsPickupToggle}
          className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
        />
        <span className="text-sm text-muted-foreground">Delivery address same as pickup</span>
      </label>

      {/* Delivery Address */}
      {!sameAsPickup && (
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
              Copy from pickup
            </Button>
          </div>
          <Input
            placeholder="Street address"
            value={deliveryAddress?.street ?? ''}
            onChange={(e) => handleDeliveryChange('street', e.target.value)}
            className={errors.delivery_address?.street ? 'border-brand-danger' : ''}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Suburb"
              value={deliveryAddress?.suburb ?? ''}
              onChange={(e) => handleDeliveryChange('suburb', e.target.value)}
            />
            <Input
              placeholder="State"
              value={deliveryAddress?.state ?? ''}
              onChange={(e) => handleDeliveryChange('state', e.target.value)}
            />
            <Input
              placeholder="Postcode"
              value={deliveryAddress?.postcode ?? ''}
              onChange={(e) => handleDeliveryChange('postcode', e.target.value)}
            />
          </div>
          {errors.delivery_address?.street && (
            <p className="text-xs text-brand-danger">{errors.delivery_address.street.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
