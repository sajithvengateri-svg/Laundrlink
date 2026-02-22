import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Star, Car, DollarSign, ExternalLink, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useDriverProfile, useDriverMetrics, useDriverRuns } from '@/hooks/useDriver'
import { usePayoutHistory } from '@/hooks/usePayout'
import { formatCents, formatDate } from '@/lib/utils'
import { downloadCsv, centsToDecimal } from '@/lib/csv'

const TIER_THRESHOLDS = { rookie: 0, elite: 50, legendary: 200 }
const TIER_LABELS = { rookie: 'Rookie', elite: 'Elite', legendary: 'Legendary' }
const TIER_COLORS = {
  rookie: 'text-gray-600 bg-gray-100',
  elite: 'text-indigo-600 bg-indigo-100',
  legendary: 'text-amber-600 bg-amber-100',
}

function getTier(totalRuns: number): keyof typeof TIER_LABELS {
  if (totalRuns >= TIER_THRESHOLDS.legendary) return 'legendary'
  if (totalRuns >= TIER_THRESHOLDS.elite) return 'elite'
  return 'rookie'
}

function getNextTierProgress(totalRuns: number): { label: string; pct: number; runsNeeded: number } {
  if (totalRuns >= TIER_THRESHOLDS.legendary) return { label: 'Legendary', pct: 100, runsNeeded: 0 }
  if (totalRuns >= TIER_THRESHOLDS.elite) {
    const pct = ((totalRuns - TIER_THRESHOLDS.elite) / (TIER_THRESHOLDS.legendary - TIER_THRESHOLDS.elite)) * 100
    return { label: 'Legendary', pct, runsNeeded: TIER_THRESHOLDS.legendary - totalRuns }
  }
  const pct = (totalRuns / TIER_THRESHOLDS.elite) * 100
  return { label: 'Elite', pct, runsNeeded: TIER_THRESHOLDS.elite - totalRuns }
}

// One week ago ISO string
function oneWeekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

export function DriverEarningsPage() {
  const navigate = useNavigate()
  const { data: driver, isLoading: profileLoading } = useDriverProfile()
  const { data: metrics, isLoading: metricsLoading } = useDriverMetrics()
  const { data: recentRuns, isLoading: runsLoading } = useDriverRuns(oneWeekAgo())
  const { data: payoutHistory } = usePayoutHistory('driver', 50)

  function handleCsvDownload() {
    if (!payoutHistory || payoutHistory.length === 0) return
    downloadCsv(
      payoutHistory.map((p) => ({
        Date: formatDate(p.created_at),
        'Order Number': (p.order as { order_number?: string } | null)?.order_number ?? '',
        'Amount (AUD)': centsToDecimal(p.amount_cents),
        Status: p.status,
        'Transfer ID': p.stripe_transfer_id ?? '',
      })),
      `laundrlink-driver-payouts-${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  const totalRuns = driver?.total_runs ?? 0
  const tier = getTier(totalRuns)
  const tierProgress = getNextTierProgress(totalRuns)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/driver')} className="p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <p className="font-semibold text-gray-900 flex-1">Earnings</p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleCsvDownload}
          disabled={!payoutHistory || payoutHistory.length === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary cards */}
        {metricsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 gap-3">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4 bg-green-50 rounded-2xl">
                <DollarSign className="h-5 w-5 text-green-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{formatCents(metrics.earningsToday)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Today</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4 bg-blue-50 rounded-2xl">
                <TrendingUp className="h-5 w-5 text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{formatCents(metrics.earningsThisWeek)}</p>
                <p className="text-xs text-gray-500 mt-0.5">This Week</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4 bg-indigo-50 rounded-2xl">
                <Car className="h-5 w-5 text-indigo-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{metrics.runsToday}</p>
                <p className="text-xs text-gray-500 mt-0.5">Runs Today</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4 bg-amber-50 rounded-2xl">
                <Star className="h-5 w-5 text-amber-500 mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.ratingAvg > 0 ? metrics.ratingAvg.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Rating</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Driver tier */}
        {profileLoading ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Driver Tier</p>
                  <span className={`inline-block mt-1 text-sm font-semibold px-2 py-0.5 rounded-full ${TIER_COLORS[tier]}`}>
                    {TIER_LABELS[tier]}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{totalRuns}</p>
                  <p className="text-xs text-gray-500">total runs</p>
                </div>
              </div>
              {tierProgress.pct < 100 && (
                <>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(tierProgress.pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {tierProgress.runsNeeded} more runs to {tierProgress.label}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stripe Connect payout CTA */}
        {driver && !driver.stripe_onboarding_complete && (
          <Card className="rounded-2xl border-0 shadow-sm bg-indigo-50 border border-indigo-200">
            <CardContent className="p-4">
              <p className="font-medium text-indigo-900 text-sm">Set up payouts</p>
              <p className="text-indigo-700 text-xs mt-0.5 mb-3">
                Connect your bank account to receive weekly earnings transfers.
              </p>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Connect Bank Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent runs */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Runs This Week</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {runsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : !recentRuns || recentRuns.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No completed runs this week</p>
            ) : (
              <div className="space-y-2">
                {recentRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Order {(run.order as { order_number?: string } | null)?.order_number ?? run.order_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {run.completed_at ? formatDate(run.completed_at) : 'Completed'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">
                      {run.cost_cents ? formatCents(run.cost_cents) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
