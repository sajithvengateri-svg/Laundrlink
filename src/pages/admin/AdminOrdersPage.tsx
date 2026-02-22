import { useState } from 'react'
import { Search, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminOrders, useOrderScanChain } from '@/hooks/useAdmin'
import { formatCents } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'pickup_scheduled', label: 'Pickup Scheduled' },
  { value: 'picked_up_by_driver', label: 'Picked Up' },
  { value: 'at_hub', label: 'At Hub' },
  { value: 'assigned_to_pro', label: 'Assigned to Pro' },
  { value: 'with_pro', label: 'With Pro' },
  { value: 'returned_to_hub', label: 'Returned to Hub' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  at_hub: 'bg-blue-100 text-blue-700',
  with_pro: 'bg-violet-100 text-violet-700',
  out_for_delivery: 'bg-sky-100 text-sky-700',
}

function ScanChainViewer({ orderId }: { orderId: string }) {
  const { data: steps, isLoading } = useOrderScanChain(orderId)

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    )
  }

  if (!steps || steps.length === 0) {
    return <p className="px-4 py-3 text-xs text-gray-400">No scan records yet</p>
  }

  return (
    <div className="px-4 pb-3">
      <div className="relative pl-5 space-y-3 border-l-2 border-gray-100 ml-2">
        {steps.map((step) => (
          <div key={step.id} className="relative">
            <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-indigo-200 border-2 border-white" />
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700 capitalize">
                  {step.step?.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-gray-400">
                  {step.created_at ? new Date(step.created_at).toLocaleString() : ''}
                </p>
              </div>
              {(step.photo_urls as string[] | null)?.length ? (
                <div className="flex gap-1">
                  {(step.photo_urls as string[]).slice(0, 3).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url}
                        alt="handoff"
                        className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: orders, isLoading, refetch } = useAdminOrders(statusFilter, debouncedSearch)

  function handleSearch(value: string) {
    setSearch(value)
    clearTimeout((handleSearch as { t?: ReturnType<typeof setTimeout> }).t)
    ;(handleSearch as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(
      () => setDebouncedSearch(value),
      350
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage all orders</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          className="text-gray-400 hover:text-gray-700"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Order number…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Order list */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-56" />
              </CardContent>
            </Card>
          ))
        ) : (orders?.length ?? 0) === 0 ? (
          <p className="text-center py-12 text-gray-400 text-sm">No orders found</p>
        ) : (
          orders!.map((order) => {
            const isExpanded = expandedId === order.id
            const colorClass =
              STATUS_COLORS[order.status ?? ''] ?? 'bg-gray-100 text-gray-600'

            return (
              <Card key={order.id} className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <button
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    <div className="flex-1 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {order.order_number}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {order.customer_name ?? '—'}
                          {order.hub_name ? ` · ${order.hub_name}` : ''}
                          {order.is_ndis ? ' · NDIS' : ''}
                        </p>
                      </div>
                      <Badge className={`text-xs border-0 ${colorClass}`}>
                        {order.status?.replace(/_/g, ' ') ?? '—'}
                      </Badge>
                      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        {formatCents(order.total_cents ?? 0)}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      <div className="px-4 py-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Scan Chain
                        </p>
                        <p className="text-xs text-gray-400">
                          Platform fee: {formatCents(order.platform_fee_cents ?? 0)}
                        </p>
                      </div>
                      <ScanChainViewer orderId={order.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {orders && orders.length > 0 && (
        <p className="text-xs text-gray-400 mt-3">{orders.length} order{orders.length !== 1 ? 's' : ''} shown (max 100)</p>
      )}
    </div>
  )
}
