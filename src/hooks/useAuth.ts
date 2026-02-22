import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { SignUpData, SignInData } from '@/types/auth.types'

export function useAuth() {
  const { user, session, profile, isLoading, setSession, setProfile, clearAuth, setLoading } =
    useAuthStore()
  const navigate = useNavigate()

  const signUp = useCallback(
    async (data: SignUpData) => {
      setLoading(true)
      try {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.full_name,
              phone: data.phone,
              role: data.role,
            },
          },
        })
        if (error) throw error
        return { error: null }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Sign up failed' }
      } finally {
        setLoading(false)
      }
    },
    [setLoading]
  )

  const signIn = useCallback(
    async (data: SignInData) => {
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
        return { error: null }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Sign in failed' }
      } finally {
        setLoading(false)
      }
    },
    [setLoading]
  )

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login')
  }, [clearAuth, navigate])

  const refreshProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()

    if (data) setProfile(data as Parameters<typeof setProfile>[0])
  }, [setProfile])

  return {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!session,
    role: profile?.role ?? null,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile,
    setSession,
    setProfile,
    clearAuth,
  }
}
