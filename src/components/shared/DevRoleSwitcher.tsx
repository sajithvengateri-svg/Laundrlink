import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Building2, Wrench, Truck, Shield, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/types/auth.types'

const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

const ROLES = [
  { role: 'customer', label: 'Customer', icon: User, path: '/orders', color: 'bg-blue-500' },
  { role: 'hub', label: 'Hub', icon: Building2, path: '/hub', color: 'bg-teal-500' },
  { role: 'pro', label: 'Pro', icon: Wrench, path: '/pro', color: 'bg-purple-500' },
  { role: 'driver', label: 'Driver', icon: Truck, path: '/driver', color: 'bg-amber-500' },
  { role: 'admin', label: 'Admin', icon: Shield, path: '/admin', color: 'bg-red-500' },
] as const

async function ensureRoleRecords(userId: string, role: string) {
  if (role === 'driver') {
    const { data } = await supabase
      .from('drivers')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (!data) {
      await supabase.from('drivers').insert({
        id: userId,
        is_available: true,
        is_verified: true,
        vehicle_type: 'car',
      })
    }
  }

  if (role === 'pro') {
    const { data } = await supabase
      .from('pros')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (!data) {
      await supabase.from('pros').insert({
        id: userId,
        is_available: true,
        tier: 'rookie',
      })
    }
  }

  if (role === 'hub') {
    const { data } = await supabase
      .from('hubs')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()
    if (!data) {
      await supabase.from('hubs').insert({
        owner_id: userId,
        business_name: 'Test Hub',
        address: { street: '123 Test St', suburb: 'Sydney', state: 'NSW', postcode: '2000' },
        is_active: true,
        capacity: 100,
        current_load: 0,
      })
    }
  }
}

export function DevRoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const { profile, setProfile } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  if (!IS_DEV_MODE || !profile) return null

  const currentRole = profile.role
  const currentRoleInfo = ROLES.find((r) => r.role === currentRole)

  const handleSwitch = async (role: string, path: string) => {
    if (role === currentRole) {
      setIsOpen(false)
      return
    }

    setSwitching(true)
    try {
      // Ensure role-specific records exist
      await ensureRoleRecords(profile.id, role)

      // Update profile role in DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase
        .from('profiles')
        .update({ role: role as Profile['role'] })
        .eq('id', profile.id)

      // Update Zustand store
      setProfile({ ...profile, role: role as Profile['role'] })

      // Invalidate all React Query caches to prevent stale role-specific data
      await queryClient.invalidateQueries()

      setIsOpen(false)
      navigate(path)
    } catch (err) {
      console.error('Failed to switch role:', err)
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="mb-2 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Dev Role Switcher</p>
            </div>
            <div className="p-1.5 space-y-0.5">
              {ROLES.map(({ role, label, icon: Icon, path, color }) => (
                <button
                  key={role}
                  onClick={() => void handleSwitch(role, path)}
                  disabled={switching}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    role === currentRole
                      ? 'bg-[#007AFF]/10 text-[#007AFF] font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  <div className={`w-6 h-6 rounded-md ${color} flex items-center justify-center`}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  {label}
                  {role === currentRole && (
                    <span className="ml-auto text-[10px] bg-[#007AFF]/20 text-[#007AFF] px-1.5 py-0.5 rounded-full">
                      active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#007AFF] text-white px-3 py-2 rounded-full shadow-lg hover:bg-[#0066DD] transition-colors text-sm font-medium"
      >
        {currentRoleInfo && <currentRoleInfo.icon className="h-4 w-4" />}
        <span className="capitalize">{currentRole}</span>
        <ChevronUp className={`h-3.5 w-3.5 transition-transform ${isOpen ? '' : 'rotate-180'}`} />
      </button>
    </div>
  )
}
