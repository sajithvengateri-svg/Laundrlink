import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatCents } from '@/lib/utils'
import type { OrderWizardData } from '@/lib/validations'

const QUICK_ITEMS = [
  { description: 'Shirts', price_cents: 500 },
  { description: 'Pants / Trousers', price_cents: 600 },
  { description: 'Suits', price_cents: 1200 },
  { description: 'Dresses', price_cents: 1000 },
  { description: 'Bedding / Linen', price_cents: 1500 },
  { description: 'Towels', price_cents: 400 },
]

export function ItemsStep() {
  const { control, register, watch, formState: { errors } } = useFormContext<OrderWizardData>()
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const items = watch('items') ?? []
  const total = items.reduce((sum, i) => sum + (i.price_cents ?? 0) * (i.quantity ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Quick Add</Label>
        <div className="flex flex-wrap gap-2">
          {QUICK_ITEMS.map((item) => (
            <Button
              key={item.description}
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => append({ ...item, quantity: 1 })}
            >
              + {item.description}
            </Button>
          ))}
        </div>
      </div>

      {/* Item list */}
      <div className="space-y-3">
        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Item description"
                    {...register(`items.${index}.description`)}
                    className={errors.items?.[index]?.description ? 'border-brand-danger' : ''}
                  />
                  <div className="flex gap-2">
                    <div className="w-24">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        placeholder="Qty"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="Price ($)"
                        defaultValue={(field.price_cents / 100).toFixed(2)}
                        onChange={(e) => {
                          const cents = Math.round(parseFloat(e.target.value || '0') * 100)
                          // react-hook-form register doesn't handle this directly for computed value
                          void import('react-hook-form').then(({ useFormContext: _u }) => {
                            // price_cents is set directly
                          })
                          void e
                          const form = document.querySelector(`input[name="items.${index}.price_cents"]`) as HTMLInputElement | null
                          if (form) form.value = String(cents)
                        }}
                      />
                      <input
                        type="hidden"
                        defaultValue={field.price_cents}
                        {...register(`items.${index}.price_cents`, { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-brand-danger shrink-0"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => append({ description: '', quantity: 1, price_cents: 0 })}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>

      {fields.length === 0 && (
        <p className="text-xs text-brand-danger text-center">Add at least one item to continue</p>
      )}

      {total > 0 && (
        <div className="flex justify-between items-center pt-2 border-t font-semibold">
          <span>Estimated Total</span>
          <span className="text-brand-blue">{formatCents(total)}</span>
        </div>
      )}
    </div>
  )
}
