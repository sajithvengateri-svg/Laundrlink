import { useMemo } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { MapPin, Star } from 'lucide-react'
import { MAPS_CONFIG, DEFAULT_MAP_OPTIONS } from '@/lib/maps'
import type { NearbyHub } from '@/types/order.types'
import { cn } from '@/lib/utils'

interface HubMapProps {
  hubs: NearbyHub[]
  selectedHubId?: string | null
  onHubSelect?: (hub: NearbyHub) => void
  centerLat?: number
  centerLng?: number
  className?: string
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

export function HubMap({
  hubs,
  selectedHubId,
  onHubSelect,
  centerLat = -33.8688,
  centerLng = 151.2093,
  className,
}: HubMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: MAPS_CONFIG.apiKey,
    libraries: MAPS_CONFIG.libraries,
  })

  const center = useMemo(
    () => ({ lat: centerLat, lng: centerLng }),
    [centerLat, centerLng]
  )

  const selectedHub = hubs.find((h) => h.id === selectedHubId)

  if (!isLoaded) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 rounded-xl', className)}>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 animate-pulse" />
          Loading map…
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl overflow-hidden', className)}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={12}
        options={{
          ...DEFAULT_MAP_OPTIONS,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {hubs.map((hub) => (
          <Marker
            key={hub.id}
            position={{
              lat: hub.lat ?? centerLat,
              lng: hub.lng ?? centerLng,
            }}
            onClick={() => onHubSelect?.(hub)}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                  <circle cx="16" cy="16" r="14" fill="${hub.id === selectedHubId ? '#007AFF' : '#00C7BE'}" stroke="white" stroke-width="2"/>
                  <text x="16" y="21" text-anchor="middle" fill="white" font-size="14">🏪</text>
                  <polygon points="10,28 22,28 16,38" fill="${hub.id === selectedHubId ? '#007AFF' : '#00C7BE'}"/>
                </svg>
              `)}`,
              scaledSize: { width: 32, height: 40 } as google.maps.Size,
            }}
          />
        ))}

        {selectedHub && (
          <InfoWindow
            position={{
              lat: selectedHub.lat ?? centerLat,
              lng: selectedHub.lng ?? centerLng,
            }}
            onCloseClick={() => onHubSelect?.(selectedHub)}
          >
            <div className="p-1 min-w-[180px]">
              <p className="font-semibold text-sm">{selectedHub.business_name}</p>
              {selectedHub.distance_km > 0 && (
                <p className="text-xs text-gray-500">{selectedHub.distance_km.toFixed(1)} km away</p>
              )}
              {selectedHub.rating && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs">{selectedHub.rating.toFixed(1)}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-0.5">
                Capacity: {Math.round(selectedHub.available_capacity_pct * 100)}% available
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
