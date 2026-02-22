import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OrderWizard } from '@/components/customer/OrderWizard/OrderWizard'

export function NewOrderPage() {
  const navigate = useNavigate()

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-semibold text-lg">New Order</h1>
          <p className="text-xs text-muted-foreground">Schedule a pickup in a few steps</p>
        </div>
      </div>

      <OrderWizard onComplete={(orderId) => navigate(`/orders/${orderId}`)} />
    </div>
  )
}
