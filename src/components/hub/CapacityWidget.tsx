import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CapacityWidgetProps {
  used: number
  max: number
  className?: string
}

export function CapacityWidget({ used, max, className }: CapacityWidgetProps) {
  const pct = max > 0 ? Math.round((used / max) * 100) : 0
  const isFull = pct >= 90

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Hub Capacity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between mb-2">
          <span className={cn('text-2xl font-bold', isFull && 'text-brand-danger')}>
            {used}
            <span className="text-sm font-normal text-muted-foreground ml-1">/ {max} bags</span>
          </span>
          <span
            className={cn(
              'text-sm font-semibold',
              pct >= 90 ? 'text-brand-danger' : pct >= 70 ? 'text-brand-amber' : 'text-brand-teal'
            )}
          >
            {pct}%
          </span>
        </div>
        <Progress
          value={pct}
          className={cn(
            'h-2',
            pct >= 90 ? '[&>div]:bg-brand-danger' : pct >= 70 ? '[&>div]:bg-brand-amber' : ''
          )}
        />
        {isFull && (
          <p className="text-xs text-brand-danger mt-2">
            Hub is near capacity — consider pausing new orders.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
