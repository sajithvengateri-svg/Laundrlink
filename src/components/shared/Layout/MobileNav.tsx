import { NavLink } from 'react-router-dom'
import { Home, ShoppingBag, Clock, User, LayoutDashboard, ScanLine, DollarSign, Truck } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const CUSTOMER_NAV = [
  { to: '/orders', icon: Home, label: 'Home' },
  { to: '/orders/new', icon: ShoppingBag, label: 'Order' },
  { to: '/orders/history', icon: Clock, label: 'History' },
  { to: '/profile', icon: User, label: 'Profile' },
]

const HUB_NAV = [
  { to: '/hub', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hub/scan', icon: ScanLine, label: 'Scanner' },
  { to: '/hub/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/hub/settings', icon: User, label: 'Settings' },
]

const PRO_NAV = [
  { to: '/pro', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pro/jobs', icon: ShoppingBag, label: 'Jobs' },
  { to: '/pro/scan', icon: ScanLine, label: 'Scanner' },
  { to: '/pro/earnings', icon: DollarSign, label: 'Earnings' },
]

const DRIVER_NAV = [
  { to: '/driver', icon: LayoutDashboard, label: 'Runs' },
  { to: '/driver/active', icon: Truck, label: 'Active' },
  { to: '/driver/scan', icon: ScanLine, label: 'Scanner' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function MobileNav() {
  const { profile } = useAuthStore()

  const navItems = (() => {
    switch (profile?.role) {
      case 'hub': return HUB_NAV
      case 'pro': return PRO_NAV
      case 'driver': return DRIVER_NAV
      default: return CUSTOMER_NAV
    }
  })()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-colors',
                isActive ? 'text-brand-blue' : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive && 'text-brand-blue')} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
