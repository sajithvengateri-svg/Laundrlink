import { useState } from 'react'
import { Copy, Check, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLoyaltyProfile, useReferralStats } from '@/hooks/useLoyalty'

export function ReferralWidget() {
  const { data: loyalty, isLoading: loyaltyLoading } = useLoyaltyProfile()
  const { data: stats, isLoading: statsLoading } = useReferralStats()
  const [copied, setCopied] = useState(false)

  const isLoading = loyaltyLoading || statsLoading
  const code = loyalty?.referralCode

  async function handleCopy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Users className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-semibold text-gray-700">Refer a Friend</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : !code ? (
          <p className="text-xs text-gray-400">
            Complete your first order to unlock your referral code!
          </p>
        ) : (
          <>
            {/* Code + copy */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-indigo-50 rounded-xl px-3 py-2 text-center">
                <p className="text-lg font-bold tracking-widest text-indigo-700">{code}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 text-indigo-500 hover:bg-indigo-50"
                onClick={() => void handleCopy()}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Share your code. You and your friend each get{' '}
              <span className="font-semibold text-indigo-600">1,000 pts ($10 off)</span> after
              their first order.
            </p>

            {/* Stats */}
            {stats && stats.total > 0 && (
              <div className="flex gap-4 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-400">Referred</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{stats.rewarded}</p>
                  <p className="text-xs text-gray-400">Rewarded</p>
                </div>
                {stats.pendingPoints > 0 && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-600">
                      {stats.pendingPoints.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Pending pts</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
