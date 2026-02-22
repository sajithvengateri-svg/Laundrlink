import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePendingVerifications, useApproveEntity, useRejectEntity } from '@/hooks/useAdmin'
import type { PendingVerification } from '@/types/admin.types'

const TYPE_COLORS = {
  hub: 'bg-emerald-100 text-emerald-700',
  pro: 'bg-violet-100 text-violet-700',
  driver: 'bg-sky-100 text-sky-700',
}

function VerificationCard({
  item,
  onApprove,
  onReject,
  isLoading,
}: {
  item: PendingVerification
  onApprove: () => void
  onReject: () => void
  isLoading: boolean
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`text-xs border-0 capitalize ${TYPE_COLORS[item.type]}`}>
                {item.type}
              </Badge>
              {item.policeCheckStatus && (
                <Badge
                  className={`text-xs border-0 ${
                    item.policeCheckStatus === 'clear'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  Police: {item.policeCheckStatus}
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900">{item.name}</p>
            {item.phone && <p className="text-xs text-gray-500">{item.phone}</p>}
            <p className="text-xs text-gray-400 mt-1">{item.reason}</p>
            <p className="text-xs text-gray-300 mt-0.5">
              Registered{' '}
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 hover:bg-red-50 h-8"
              disabled={isLoading}
              onClick={onReject}
            >
              <XCircle className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white h-8"
              disabled={isLoading}
              onClick={onApprove}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminVerificationPage() {
  const { data: items, isLoading } = usePendingVerifications()
  const approve = useApproveEntity()
  const reject = useRejectEntity()

  const pending = items ?? []
  const hubs = pending.filter((i) => i.type === 'hub')
  const pros = pending.filter((i) => i.type === 'pro')
  const drivers = pending.filter((i) => i.type === 'driver')

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Approve or reject pending hubs, pros, and drivers
          </p>
        </div>
        {!isLoading && pending.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <Clock className="h-3.5 w-3.5" />
            {pending.length} pending
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <CheckCircle className="h-12 w-12 text-green-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">All clear — nothing pending</p>
        </div>
      ) : (
        <div className="space-y-6">
          {hubs.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Hubs ({hubs.length})
              </h2>
              <div className="space-y-2">
                {hubs.map((item) => (
                  <VerificationCard
                    key={item.entityId}
                    item={item}
                    isLoading={approve.isPending || reject.isPending}
                    onApprove={() => approve.mutate({ type: 'hub', entityId: item.entityId })}
                    onReject={() => reject.mutate({ type: 'hub', entityId: item.entityId })}
                  />
                ))}
              </div>
            </section>
          )}
          {pros.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Laundry Pros ({pros.length})
              </h2>
              <div className="space-y-2">
                {pros.map((item) => (
                  <VerificationCard
                    key={item.entityId}
                    item={item}
                    isLoading={approve.isPending || reject.isPending}
                    onApprove={() => approve.mutate({ type: 'pro', entityId: item.entityId })}
                    onReject={() => reject.mutate({ type: 'pro', entityId: item.entityId })}
                  />
                ))}
              </div>
            </section>
          )}
          {drivers.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Drivers ({drivers.length})
              </h2>
              <div className="space-y-2">
                {drivers.map((item) => (
                  <VerificationCard
                    key={item.entityId}
                    item={item}
                    isLoading={approve.isPending || reject.isPending}
                    onApprove={() =>
                      approve.mutate({ type: 'driver', entityId: item.entityId })
                    }
                    onReject={() =>
                      reject.mutate({ type: 'driver', entityId: item.entityId })
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
