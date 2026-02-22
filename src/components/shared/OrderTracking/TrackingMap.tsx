import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { GoogleMap, useLoadScript, MarkerF } from '@react-google-maps/api'
import type { OrderWithDetails } from '@/types/order.types'
import { MapPin } from 'lucide-react'

interface TrackingMapProps {
  order: OrderWithDetails
  className?: string
}

interface DriverLocation {
  lat: number
  lng: number
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

const DRIVER_ICON = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  fillColor: '#007AFF',
  fillOpacity: 1,
  strokeWeight: 0,
  scale: 1.4,
}

const DELIVERY_ICON = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  fillColor: '#00C7BE',
  fillOpacity: 1,
  strokeWeight: 0,
  scale: 1.2,
}

export function TrackingMap({ order, className = '' }: TrackingMapProps) {
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  })

  // Delivery address coordinates from order
  const deliveryAddr = order.delivery_address as Record<string, unknown> | null
  const deliveryLat = deliveryAddr?.lat as number | undefined
  const deliveryLng = deliveryAddr?.lng as number | undefined

  const center = driverLocation ??
    (deliveryLat && deliveryLng ? { lat: deliveryLat, lng: deliveryLng } : { lat: -33.8688, lng: 151.2093 })

  // Subscribe to driver location via dispatch_jobs / drivers table
  useEffect(() => {
    if (!order.id) return

    // Listen for driver location updates when order is out for delivery
    if (order.status !== 'out_for_delivery' && order.status !== 'picked_up_by_driver') return

    const channel = supabase
      .channel(`driver-location-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          // If we know the driver ID, filter by it; otherwise listen broadly
          ...(order.driver_deliver_id ? { filter: `id=eq.${order.driver_deliver_id}` } : {}),
        },
        (payload) => {
          // location is a PostGIS geography(Point) stored as GeoJSON
          const loc = payload.new as { location?: { coordinates?: [number, number] } }
          if (loc.location?.coordinates) {
            const [lng, lat] = loc.location.coordinates
            setDriverLocation({ lat, lng })
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [order.id, order.status, order.driver_deliver_id, queryClient])

  const isTracking =
    order.status === 'out_for_delivery' || order.status === 'picked_up_by_driver'

  if (!isTracking) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-xl border ${className}`}>
        <div className="text-center py-6">
          <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Live tracking available once your order is out for delivery
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return <div className={`bg-gray-100 animate-pulse rounded-xl ${className}`} />
  }

  return (
    <div className={`rounded-xl overflow-hidden border ${className}`}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={14}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
        }}
      >
        {/* Delivery destination pin */}
        {deliveryLat && deliveryLng && (
          <MarkerF
            position={{ lat: deliveryLat, lng: deliveryLng }}
            icon={DELIVERY_ICON}
            title="Your address"
          />
        )}

        {/* Driver live location pin */}
        {driverLocation && (
          <MarkerF
            position={driverLocation}
            icon={DRIVER_ICON}
            title="Driver"
          />
        )}
      </GoogleMap>

      {!driverLocation && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-muted-foreground shadow">
          Waiting for driver location…
        </div>
      )}
    </div>
  )
}
