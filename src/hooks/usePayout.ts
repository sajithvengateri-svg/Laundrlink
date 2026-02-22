import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
  getPayoutHistory,
  getPayoutSummary,
  type PayoutRecord,
  type PayoutSummary,
} from '@/services/payout.service'
import {
  triggerNdisInvoice,
  getNdisInvoiceByOrder,
  type NdisInvoice,
  type TriggerNdisResponse,
} from '@/services/ndis.service'

type PayoutProfileType = 'hub' | 'pro' | 'driver'

export function usePayoutHistory(type: PayoutProfileType, limit = 30) {
  const { user } = useAuthStore()
  return useQuery<PayoutRecord[], Error>({
    queryKey: ['payoutHistory', user?.id, type, limit],
    queryFn: () => getPayoutHistory(user!.id, type, limit),
    enabled: !!user?.id,
  })
}

export function usePayoutSummary(type: PayoutProfileType) {
  const { user } = useAuthStore()
  return useQuery<PayoutSummary, Error>({
    queryKey: ['payoutSummary', user?.id, type],
    queryFn: () => getPayoutSummary(user!.id, type),
    enabled: !!user?.id,
  })
}

export function useNdisInvoice(orderId: string | undefined) {
  return useQuery<NdisInvoice | null, Error>({
    queryKey: ['ndisInvoice', orderId],
    queryFn: () => getNdisInvoiceByOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: (query) => {
      // Poll every 3s while invoice is generating
      const data = query.state.data as NdisInvoice | null
      return data?.status === 'generating' ? 3000 : false
    },
  })
}

export function useTriggerNdisInvoice() {
  const queryClient = useQueryClient()
  return useMutation<TriggerNdisResponse, Error, string>({
    mutationFn: (orderId: string) => triggerNdisInvoice(orderId),
    onSuccess: (_data, orderId) => {
      void queryClient.invalidateQueries({ queryKey: ['ndisInvoice', orderId] })
    },
  })
}
