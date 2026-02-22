import { useState, useEffect } from 'react'

interface GeolocationState {
  lat: number | null
  lng: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation(enabled = true) {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
  })

  useEffect(() => {
    if (!enabled) return
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation not supported' }))
      return
    }

    setState((s) => ({ ...s, loading: true }))

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
          loading: false,
        })
      },
      (err) => {
        setState((s) => ({
          ...s,
          error: err.message,
          loading: false,
        }))
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [enabled])

  return state
}
