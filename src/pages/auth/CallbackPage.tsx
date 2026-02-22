import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function CallbackPage() {
  const navigate = useNavigate()
  const { setSession, setProfile } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        navigate('/login')
        return
      }

      setSession(session)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile) setProfile(profile as Parameters<typeof setProfile>[0])

      // Redirect to role-appropriate home
      const role = profile?.role as string
      const destinations: Record<string, string> = {
        customer: '/orders',
        hub: '/hub',
        pro: '/pro',
        driver: '/driver',
        admin: '/admin',
      }
      navigate(destinations[role] ?? '/orders', { replace: true })
    }

    void handleCallback()
  }, [navigate, setSession, setProfile])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  )
}
