import { useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { OrderWizardData } from '@/lib/validations'

const SERVICES = [
  { value: 'wash_fold', label: 'Wash & Fold', description: 'Washed, dried, and folded', icon: '🧺', price: 'from $15' },
  { value: 'wash_iron', label: 'Wash & Iron', description: 'Washed, dried, and pressed', icon: '👔', price: 'from $25' },
  { value: 'dry_clean', label: 'Dry Clean', description: 'Professional dry cleaning', icon: '✨', price: 'from $12/item' },
  { value: 'ironing', label: 'Ironing Only', description: 'Drop off already-washed items', icon: '🪄', price: 'from $8' },
  { value: 'express', label: 'Express (24h)', description: 'Same-day or next-day turnaround', icon: '⚡', price: '+$15' },
]

export function ServiceStep() {
  const { watch, setValue, register, formState: { errors } } = useFormContext<OrderWizardData>()
  const selected = watch('service_type')
  const isNdis = watch('is_ndis')

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-3 block">Service Type</Label>
        <div className="grid gap-2">
          {SERVICES.map((svc) => (
            <button
              key={svc.value}
              type="button"
              onClick={() => setValue('service_type', svc.value as OrderWizardData['service_type'], { shouldValidate: true })}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                selected === svc.value
                  ? 'border-brand-blue bg-brand-blue/5 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="text-2xl">{svc.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{svc.label}</p>
                <p className="text-xs text-muted-foreground">{svc.description}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{svc.price}</span>
            </button>
          ))}
        </div>
        {errors.service_type && (
          <p className="text-xs text-brand-danger mt-1">{errors.service_type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Special Instructions (optional)</Label>
        <Input
          id="instructions"
          placeholder="e.g. Gentle cycle, no bleach, hang dry shirts"
          {...register('special_instructions')}
        />
      </div>

      {/* NDIS toggle */}
      <div className="border rounded-xl p-4 space-y-3">
        <button
          type="button"
          onClick={() => setValue('is_ndis', !isNdis)}
          className="w-full flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-sm">NDIS Funded</p>
            <p className="text-xs text-muted-foreground">I have NDIS funding for this service</p>
          </div>
          <div className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            isNdis ? 'bg-brand-blue' : 'bg-gray-200'
          )}>
            <div className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
              isNdis ? 'translate-x-5' : 'translate-x-1'
            )} />
          </div>
        </button>

        {isNdis && (
          <div className="space-y-2 pt-1 border-t">
            <div className="space-y-1">
              <Label htmlFor="ndis_number" className="text-xs">NDIS Number</Label>
              <Input
                id="ndis_number"
                placeholder="43XXXXXXXX"
                {...register('ndis_number')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ndis_plan_manager" className="text-xs">Plan Manager (optional)</Label>
              <Input
                id="ndis_plan_manager"
                placeholder="Plan manager name or organisation"
                {...register('ndis_plan_manager')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
