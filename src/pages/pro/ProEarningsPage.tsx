import { ExternalLink, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProProfile, useProMetrics, useProCompletedJobs } from '@/hooks/usePro'
import { usePayoutHistory } from '@/hooks/usePayout'
import { formatCents, formatDate } from '@/lib/utils'
import { downloadCsv, centsToDecimal } from '@/lib/csv'

const TIER_CONFIG = {
  rookie: { label: 'Rookie', next: 'Elite', threshold: 50, color: 'bg-gray-400' },
  elite: { label: 'Elite', next: 'Legendary', threshold: 200, color: 'bg-blue-500' },
  legendary: { label: 'Legendary', next: null, threshold: 200, color: 'bg-purple-500' },
}

function oneWeekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

export function ProEarningsPage() {
  const { data: pro, isLoading: proLoading } = useProProfile()
  const { data: metrics, isLoading: metricsLoading } = useProMetrics()
  const { data: completedJobs, isLoading: jobsLoading } = useProCompletedJobs(oneWeekAgo())
  const { data: payoutHistory } = usePayoutHistory('pro', 50)

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
      `laundrlink-pro-payouts-${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  const tier = pro?.tier ?? 'rookie'
  const tierConf = TIER_CONFIG[tier]
  const totalOrders = metrics?.totalOrders ?? 0
  const tierProgress = tier === 'legendary'
    ? 100
    : Math.min(100, Math.round((totalOrders / tierConf.threshold) * 100))

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Earnings</h1>
          <p className="text-sm text-gray-500">Your pay and tier progress</p>
        </div>
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
        {/* Earnings grid */}
        <div className="grid grid-cols-2 gap-3">
          {metricsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-4">
                  <Skeleton className="h-8 w-20 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-indigo-600">
                    {formatCents(metrics?.earningsToday ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Today</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-indigo-600">
                    {formatCents(metrics?.earningsThisWeek ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">This Week</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-indigo-600">
                    {metrics?.jobsToday ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Jobs Today</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-indigo-600">
                    {metrics?.ratingAvg ? metrics.ratingAvg.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Avg Rating</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Per-bag rate */}
        {!proLoading && pro?.price_per_bag != null && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Your rate</p>
                <p className="text-xs text-gray-500">Per bag processed</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-600">
                  {formatCents(pro.price_per_bag)}
                </p>
                {pro.express_price_per_bag != null && (
                  <p className="text-xs text-gray-400">
                    Express: {formatCents(pro.express_price_per_bag)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tier progress */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Tier Progress</p>
              <span className={[
                'text-xs font-bold px-2 py-0.5 rounded-full text-white capitalize',
                tierConf.color,
              ].join(' ')}>
                {tierConf.label}
              </span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className={['h-2 rounded-full transition-all', tierConf.color].join(' ')}
                style={{ width: `${tierProgress}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-400">
              <span>{totalOrders} orders completed</span>
              {tierConf.next && (
                <span>{tierConf.threshold - totalOrders} to {tierConf.next}</span>
              )}
            </div>

            {tier === 'legendary' && (
              <p className="text-xs text-purple-600 font-semibold mt-2 text-center">
                🎉 Top tier achieved!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stripe Connect */}
        {!proLoading && !pro?.stripe_onboarding_complete && (
          <Card className="rounded-2xl border-indigo-200 bg-indigo-50">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-indigo-800 mb-1">
                Connect your bank account
              </p>
              <p className="text-xs text-indigo-600 mb-3">
                Set up Stripe to receive weekly payouts directly to your bank.
              </p>
              <Button size="sm" className="w-full rounded-xl gap-2">
                Set Up Payouts
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent jobs */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Recent Completed Jobs</h2>
          {jobsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="rounded-2xl">
                  <CardContent className="p-3">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (completedJobs?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No completed jobs this week
            </p>
          ) : (
            <div className="space-y-2">
              {completedJobs!.map((job) => (
                <Card key={job.id} className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Order #{job.order_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(job.hub as { business_name?: string } | undefined | null)?.business_name ?? 'Hub'} ·{' '}
                        {new Date(job.updated_at!).toLocaleDateString()}
                      </p>
                    </div>
                    {job.pro_payout_cents != null && (
                      <p className="text-sm font-semibold text-indigo-600">
                        {formatCents(job.pro_payout_cents)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
