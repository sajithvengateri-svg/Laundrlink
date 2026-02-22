import { Gift } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLoyaltyProfile } from '@/hooks/useLoyalty'
import { TIER_CONFIG, POINTS_REDEMPTION_RATE } from '@/types/loyalty.types'
import { formatCents } from '@/lib/utils'

export function LoyaltyWidget() {
  const { data: loyalty, isLoading } = useLoyaltyProfile()

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-2 w-full rounded-full mb-2" />
          <Skeleton className="h-3 w-36" />
        </CardContent>
      </Card>
    )
  }

  const points = loyalty?.points ?? 0
  const tier = loyalty?.tier ?? 'bronze'
  const config = TIER_CONFIG[tier]

  // Progress to next tier
  const progressPct = config.nextMinPoints
    ? Math.min(100, Math.round(((points - config.minPoints) / (config.nextMinPoints - config.minPoints)) * 100))
    : 100

  // Points value in dollars
  const dollarValue = Math.floor(points / POINTS_REDEMPTION_RATE) // 100 pts = $1

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-indigo-500" />
            <p className="text-sm font-semibold text-gray-700">Loyalty Points</p>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}
          >
            {config.label}
          </span>
        </div>

        <p className="text-3xl font-bold text-indigo-600 mb-1">
          {points.toLocaleString()}
          <span className="text-sm font-normal text-gray-400 ml-1">pts</span>
        </p>

        {dollarValue > 0 && (
          <p className="text-xs text-green-600 font-medium mb-2">
            Worth {formatCents(dollarValue * 100)} off your next order
          </p>
        )}

        {/* Tier progress */}
        {config.nextTier && (
          <>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
              <div
                className="h-1.5 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {(config.nextMinPoints! - points).toLocaleString()} pts to{' '}
              {TIER_CONFIG[config.nextTier].label}
            </p>
          </>
        )}

        {!config.nextTier && (
          <p className="text-xs text-yellow-600 font-semibold">
            Gold member — maximum tier reached!
          </p>
        )}
      </CardContent>
    </Card>
  )
}
