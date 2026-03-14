import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BagScanner } from '@/components/hub/BagScanner'
import { useHub } from '@/hooks/useHub'
import { Skeleton } from '@/components/ui/skeleton'
import type { HandoffStep } from '@/types/hub.types'

const SCAN_STEPS: { step: HandoffStep; label: string; description: string }[] = [
  { step: 'customer_to_driver', label: 'Customer to Driver', description: 'Pickup from customer' },
  { step: 'driver_to_hub', label: 'Driver to Hub', description: 'Bag arriving at hub' },
  { step: 'hub_to_pro', label: 'Hub to Pro', description: 'Send for washing' },
  { step: 'pro_to_hub', label: 'Pro to Hub', description: 'Clean bag returned' },
  { step: 'hub_to_driver', label: 'Hub to Driver', description: 'Send for delivery' },
  { step: 'driver_to_customer', label: 'Driver to Customer', description: 'Deliver to customer' },
]

export default function HubScanPage() {
  const { data: hub, isLoading } = useHub()
  const [selectedStep, setSelectedStep] = useState<HandoffStep | null>(null)

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!hub) {
    return (
      <div className="p-4 text-center py-16 text-muted-foreground text-sm">
        Hub not set up yet.
      </div>
    )
  }

  if (selectedStep) {
    const stepInfo = SCAN_STEPS.find((s) => s.step === selectedStep)!
    return (
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedStep(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg">{stepInfo.label}</h1>
            <p className="text-sm text-muted-foreground">{stepInfo.description}</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4">
            <BagScanner
              hubId={hub.id}
              step={selectedStep}
              toUserId={hub.owner_id}
              onComplete={() => {
                setTimeout(() => setSelectedStep(null), 1500)
              }}
              onNextStep={(nextStep) => setSelectedStep(nextStep)}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold">Scan Bag</h1>
        <p className="text-sm text-muted-foreground">Select the type of handoff you're recording</p>
      </div>

      <div className="grid gap-3">
        {SCAN_STEPS.map((item) => (
          <Card
            key={item.step}
            className="cursor-pointer hover:border-brand-blue active:scale-[0.98] transition-all"
            onClick={() => setSelectedStep(item.step)}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-base">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
