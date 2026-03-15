import { useCallback, useMemo } from 'react'
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api'

export interface MapMarker {
  lat: number
  lng: number
  label?: string
  color: 'green' | 'blue' | 'orange' | 'gray' | 'red'
}

interface LaundrlinkMapProps {
  markers: MapMarker[]
  showRoute?: boolean
  height?: number
  className?: string
}

const MARKER_COLORS: Record<MapMarker['color'], string> = {
  green: '#2D6A4F',
  blue: '#1D4ED8',
  orange: '#D97706',
  gray: '#9CA3AF',
  red: '#DC2626',
}

const MAP_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]

export function LaundrlinkMap({ markers, showRoute = false, height = 250, className }: LaundrlinkMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  })

  const center = useMemo(() => {
    if (markers.length === 0) return { lat: -33.8688, lng: 151.2093 }
    const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length
    const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length
    return { lat: avgLat, lng: avgLng }
  }, [markers])

  const routePath = useMemo(
    () => (showRoute ? markers.map((m) => ({ lat: m.lat, lng: m.lng })) : []),
    [markers, showRoute]
  )

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      if (markers.length <= 1) return
      const bounds = new google.maps.LatLngBounds()
      markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }))
      map.fitBounds(bounds, 40)
    },
    [markers]
  )

  // Fallback if maps can't load
  if (loadError || !apiKey || apiKey === 'placeholder') {
    return (
      <div
        className={`bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-400 ${className ?? ''}`}
        style={{ height }}
      >
        <div className="text-center px-4">
          <p className="font-medium text-gray-500">Map unavailable</p>
          <p className="text-xs mt-1">
            {markers.length} location{markers.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        className={`bg-gray-100 rounded-xl animate-pulse ${className ?? ''}`}
        style={{ height }}
      />
    )
  }

  return (
    <div className={`rounded-xl overflow-hidden ${className ?? ''}`} style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={markers.length <= 1 ? 14 : undefined}
        onLoad={onLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: MAP_STYLES,
        }}
      >
        {markers.map((m, i) => (
          <Marker
            key={i}
            position={{ lat: m.lat, lng: m.lng }}
            label={
              m.label
                ? {
                    text: m.label,
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }
                : undefined
            }
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: MARKER_COLORS[m.color],
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            }}
          />
        ))}
        {showRoute && routePath.length >= 2 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#2D6A4F',
              strokeOpacity: 0.8,
              strokeWeight: 3,
            }}
          />
        )}
      </GoogleMap>
    </div>
  )
}
