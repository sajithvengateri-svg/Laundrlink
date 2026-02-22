import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, MapPin, Calendar, RefreshCw, Star, FileText, Download, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrder } from '@/hooks/useOrder'
import { useOrderRealtime } from '@/hooks/useOrderRealtime'
import { OrderTimeline } from '@/components/shared/OrderTracking/OrderTimeline'
import { TrackingMap } from '@/components/shared/OrderTracking/TrackingMap'
import { RatingModal } from '@/components/shared/Rating/RatingModal'
import { hasRatedOrder } from '@/services/rating.service'
import { useAuthStore } from '@/stores/authStore'
import { formatCents, formatDate } from '@/lib/utils'
import type { RateEntity } from '@/types/rating.types'
import { useNdisInvoice, useTriggerNdisInvoice } from '@/hooks/usePayout'

const TRACKABLE_STATUSES = new Set(['picked_up_by_driver', 'out_for_delivery'])

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: order, isLoading, refetch } = useOrder(id ?? '')
  const [isRatingOpen, setIsRatingOpen] = useState(false)

  // NDIS invoice
  const { data: ndisInvoice } = useNdisInvoice(order?.is_ndis ? id : undefined)
  const { mutate: triggerInvoice, isPending: triggering } = useTriggerNdisInvoice()

  // Subscribe to realtime updates — invalidates query on any change
  useOrderRealtime(id ?? null)

  const { data: alreadyRated, refetch: refetchRated } = useQuery({
    queryKey: ['hasRated', id, user?.id],
    queryFn: () => hasRatedOrder(id!, user!.id),
    enabled: !!id && !!user?.id && order?.status === 'delivered',
  })

  const showRateCTA = order?.status === 'delivered' && !alreadyRated

  const entities: RateEntity[] = []
  if (order?.hub_id) {
    entities.push({
      type: 'hub',
      id: order.hub_id,
      name: (order.hub as { business_name?: string } | null)?.business_name ?? 'Hub',
    })
  }
  if (order?.pro_id) {
    entities.push({ type: 'pro', id: order.pro_id, name: 'Your Laundry Pro' })
  }
  if (order?.driver_deliver_id) {
    entities.push({ type: 'driver', id: order.driver_deliver_id, name: 'Your Driver' })
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-muted-foreground">Order not found.</p>
        <Button variant="ghost" onClick={() => navigate('/orders')} className="mt-2">
          Back to Orders
        </Button>
      </div>
    )
  }

  const showMap = TRACKABLE_STATUSES.has(order.status ?? '')

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-lg">{order.order_number}</h1>
          <p className="text-xs text-muted-foreground">
            {order.created_at ? formatDate(order.created_at) : ''}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => void refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Live tracking map — only when driver is en route */}
      {showMap && <TrackingMap order={order} className="h-48" />}

      {/* Order Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tracking</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <OrderTimeline order={order} />
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardContent className="py-3 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-blue shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm truncate">
                {(order.pickup_address as Record<string, string>)?.formatted ??
                  (order.pickup_address as Record<string, string>)?.street}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-teal shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pickup date</p>
              <p className="text-sm">
                {order.pickup_scheduled_at ? formatDate(order.pickup_scheduled_at) : '—'}
              </p>
            </div>
          </div>
          {order.hub && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-amber shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Hub</p>
                <p className="text-sm">{order.hub.business_name}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}× {item.item_type ?? item.notes ?? 'Item'}
                </span>
                <span>{formatCents((item.unit_price_cents ?? 0) * (item.quantity ?? 0))}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2 border-t text-sm">
              <span>Total</span>
              <span className="text-brand-blue">{formatCents(order.total_cents ?? 0)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NDIS Invoice */}
      {order.is_ndis && (
        <Card>
          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-blue shrink-0" />
              <div>
                <p className="text-sm font-medium">NDIS Invoice</p>
                <p className="text-xs text-muted-foreground">
                  {ndisInvoice?.status === 'ready'
                    ? ndisInvoice.invoice_number
                    : ndisInvoice?.status === 'generating'
                      ? 'Generating…'
                      : 'Not yet generated'}
                </p>
              </div>
            </div>
            {ndisInvoice?.status === 'ready' && ndisInvoice.pdf_url ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                asChild
              >
                <a href={ndisInvoice.pdf_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </Button>
            ) : ndisInvoice?.status === 'generating' ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            ) : order.status === 'delivered' ? (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={triggering}
                onClick={() => triggerInvoice(order.id)}
              >
                {triggering ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Generate'
                )}
              </Button>
            ) : (
              <Badge variant="secondary" className="text-xs shrink-0">Available after delivery</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rate Your Experience */}
      {showRateCTA && entities.length > 0 && (
        <Button
          className="w-full rounded-2xl gap-2"
          onClick={() => setIsRatingOpen(true)}
        >
          <Star className="h-4 w-4" />
          Rate Your Experience
        </Button>
      )}

      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        orderId={order.id}
        entities={entities}
        onComplete={() => {
          setIsRatingOpen(false)
          void refetchRated()
        }}
      />
    </div>
  )
}
