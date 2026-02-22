import { Download, ExternalLink, TrendingUp, DollarSign, Calendar, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useHub } from '@/hooks/useHub'
import { usePayoutHistory, usePayoutSummary } from '@/hooks/usePayout'
import { useAuthStore } from '@/stores/authStore'
import { formatCents, formatDate } from '@/lib/utils'
import { downloadCsv, centsToDecimal } from '@/lib/csv'

export function HubEarningsPage() {
  const { user } = useAuthStore()
  const { data: hub, isLoading: hubLoading } = useHub()
  const { data: summary, isLoading: summaryLoading } = usePayoutSummary('hub')
  const { data: history, isLoading: historyLoading } = usePayoutHistory('hub', 50)

  function handleCsvDownload() {
    if (!history || history.length === 0) return
    downloadCsv(
      history.map((p) => ({
        Date: formatDate(p.created_at),
        'Order Number': (p.order as { order_number?: string } | null)?.order_number ?? '',
        'Amount (AUD)': centsToDecimal(p.amount_cents),
        Status: p.status,
        'Transfer ID': p.stripe_transfer_id ?? '',
      })),
      `laundrlink-hub-payouts-${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Earnings</h1>
          <p className="text-sm text-gray-500">Hub payout dashboard</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleCsvDownload}
          disabled={!history || history.length === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary cards */}
        {summaryLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 gap-3">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4 bg-green-50 rounded-2xl">
                <DollarSign className="h-5 w-5 text-green-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatCents(summary.thisMonthEarned)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">This Month</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4 bg-blue-50 rounded-2xl">
                <TrendingUp className="h-5 w-5 text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatCents(summary.lastMonthEarned)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Last Month</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4 bg-indigo-50 rounded-2xl">
                <Calendar className="h-5 w-5 text-indigo-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatCents(summary.totalEarned)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">All Time</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4 bg-amber-50 rounded-2xl">
                <Clock className="h-5 w-5 text-amber-500 mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatCents(summary.pendingPayout)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Pending</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Stripe Connect */}
        {!hubLoading && hub && !hub.stripe_connect_id && (
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

        {/* Payout history */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Payout History</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {historyLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : !history || history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No payouts yet</p>
            ) : (
              <div className="space-y-0 divide-y">
                {history.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {(p.order as { order_number?: string } | null)?.order_number ?? 'Payout'}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <Badge
                        variant={
                          p.status === 'completed'
                            ? 'success'
                            : p.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="text-xs capitalize"
                      >
                        {p.status}
                      </Badge>
                      <p className="text-sm font-semibold text-green-600 w-16 text-right">
                        {formatCents(p.amount_cents)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hub stats note */}
        {user && (
          <p className="text-xs text-center text-gray-400">
            Hub receives 70% of each order. Weekly payouts via Stripe Connect.
          </p>
        )}
      </div>
    </div>
  )
}
