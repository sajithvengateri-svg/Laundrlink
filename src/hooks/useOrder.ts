import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrderById, getCustomerOrders, createOrder, cancelOrder } from '@/services/order.service'
import { useAuthStore } from '@/stores/authStore'
import type { CreateOrderParams } from '@/types/order.types'

export function useCustomerOrders() {
  const profile = useAuthStore((s) => s.profile)
  const customerId = profile?.id ?? ''

  return useQuery({
    queryKey: ['orders', customerId],
    queryFn: () => getCustomerOrders(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  })
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
    staleTime: 0, // always refetch — order status changes frequently during field testing
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const profile = useAuthStore((s) => s.profile)

  return useMutation({
    mutationFn: (params: Omit<CreateOrderParams, 'customerId'>) =>
      createOrder({ ...params, customerId: profile!.id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: (_data, orderId) => {
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
