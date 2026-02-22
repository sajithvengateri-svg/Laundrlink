import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePricingConfig, useUpdatePricingConfig } from '@/hooks/useAdmin'
import { formatCents } from '@/lib/utils'

interface FieldSpec {
  key: string
  label: string
  hint: string
  unit: 'cents' | 'percent' | 'points'
}

const PRICING_FIELDS: FieldSpec[] = [
  { key: 'individual_bag_cents', label: 'Individual Bag Price', hint: 'Base price per bag', unit: 'cents' },
  { key: 'family_bag_cents', label: 'Family Bag Price', hint: 'Discounted family bag price', unit: 'cents' },
  { key: 'express_surcharge_cents', label: 'Express Surcharge', hint: 'Added to base price for express', unit: 'cents' },
  { key: 'pickup_fee_cents', label: 'Pickup Fee', hint: 'Fee charged for pickup', unit: 'cents' },
  { key: 'delivery_fee_cents', label: 'Delivery Fee', hint: 'Fee charged for delivery', unit: 'cents' },
  { key: 'ironing_addon_cents', label: 'Ironing Add-on', hint: 'Per-bag ironing surcharge', unit: 'cents' },
  { key: 'min_order_cents', label: 'Minimum Order', hint: 'Minimum order total', unit: 'cents' },
  { key: 'hub_share_percent', label: 'Hub Share %', hint: 'Percentage of payment going to hub', unit: 'percent' },
  { key: 'platform_share_percent', label: 'Platform Share %', hint: 'Percentage kept by platform', unit: 'percent' },
  { key: 'points_per_dollar', label: 'Loyalty Points per $1', hint: 'Points earned per dollar spent', unit: 'points' },
]

function centsToDisplay(val: number | null) {
  if (val === null) return ''
  return (val / 100).toFixed(2)
}

function displayToCents(val: string) {
  const n = parseFloat(val)
  return isNaN(n) ? null : Math.round(n * 100)
}

export function AdminSettingsPage() {
  const { data: config, isLoading } = usePricingConfig()
  const update = useUpdatePricingConfig()

  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!config) return
    const initial: Record<string, string> = {}
    PRICING_FIELDS.forEach(({ key, unit }) => {
      const val = (config as Record<string, number | null>)[key]
      if (unit === 'cents') {
        initial[key] = centsToDisplay(val)
      } else {
        initial[key] = val != null ? String(val) : ''
      }
    })
    setDraft(initial)
  }, [config])

  async function handleSave() {
    if (!config) return
    const updates: Record<string, number | null> = {}
    PRICING_FIELDS.forEach(({ key, unit }) => {
      if (unit === 'cents') {
        updates[key] = displayToCents(draft[key] ?? '')
      } else {
        const n = parseFloat(draft[key] ?? '')
        updates[key] = isNaN(n) ? null : n
      }
    })
    await update.mutateAsync({ id: config.id, updates })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform-wide pricing configuration</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Pricing Config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))
          ) : !config ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No pricing config found in database
            </p>
          ) : (
            PRICING_FIELDS.map(({ key, label, hint, unit }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                  {unit === 'cents' && config && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      (current: {formatCents((config as Record<string, number | null>)[key] ?? 0)})
                    </span>
                  )}
                </label>
                <div className="relative">
                  {unit === 'cents' && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      $
                    </span>
                  )}
                  <input
                    type="number"
                    step={unit === 'cents' ? '0.01' : '1'}
                    min="0"
                    value={draft[key] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    className={[
                      'w-full py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500',
                      unit === 'cents' ? 'pl-7 pr-3' : 'px-3',
                    ].join(' ')}
                  />
                  {unit === 'percent' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      %
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {config && (
        <div className="mt-4 flex items-center gap-3">
          <Button
            className="gap-2"
            onClick={() => void handleSave()}
            disabled={update.isPending}
          >
            <Save className="h-4 w-4" />
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
          {saved && (
            <p className="text-sm text-green-600 font-medium">Saved!</p>
          )}
          {update.isError && (
            <p className="text-sm text-red-500">Save failed — try again</p>
          )}
        </div>
      )}
    </div>
  )
}
