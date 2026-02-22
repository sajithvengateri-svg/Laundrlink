import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { ArrowLeft, MapPin, Star, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGeolocation } from '@/hooks/useGeolocation'
import { getNearbyHubs } from '@/services/order.service'
import { useQuery } from '@tanstack/react-query'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

const DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 } // Sydney CBD fallback

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.06 } }),
}

export function FindHubsPage() {
  const navigate = useNavigate()
  const { lat, lng } = useGeolocation()
  const [search, setSearch] = useState('')
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null)
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null)

  const center = lat != null && lng != null ? { lat, lng } : DEFAULT_CENTER

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: MAPS_KEY })

  const { data: hubs = [], isLoading } = useQuery({
    queryKey: ['publicHubs', lat, lng],
    queryFn: () => getNearbyHubs(
      lat ?? DEFAULT_CENTER.lat,
      lng ?? DEFAULT_CENTER.lng,
      20_000
    ),
    staleTime: 5 * 60_000,
  })

  const filtered = hubs.filter(
    (h) =>
      search === '' ||
      h.business_name?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedHub = hubs.find((h) => h.id === selectedHubId) ?? null

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map)
  }, [])

  const handleHubClick = (hubId: string, hubLat: number, hubLng: number) => {
    setSelectedHubId(hubId)
    mapRef?.panTo({ lat: hubLat, lng: hubLng })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* Nav */}
      <nav className="shrink-0 bg-white border-b border-gray-100 z-20">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-gray-900">Find Nearby Hubs</span>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-96 shrink-0 flex flex-col border-r border-gray-100 overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by hub name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Hub list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                {search ? 'No hubs match your search.' : 'No hubs found in your area.'}
              </div>
            ) : (
              filtered.map((hub, i) => {
                const isSelected = hub.id === selectedHubId
                const hubLat = hub.lat
                const hubLng = hub.lng
                return (
                  <motion.div
                    key={hub.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    custom={i}
                  >
                    <Card
                      className={`cursor-pointer transition-all border ${
                        isSelected ? 'border-brand-blue shadow-sm' : 'border-gray-100 hover:border-gray-200'
                      }`}
                      onClick={() => hubLat != null && hubLng != null && handleHubClick(hub.id, hubLat, hubLng)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{hub.business_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {hub.distance_km != null ? `${hub.distance_km.toFixed(1)} km away` : 'Distance unknown'}
                            </p>
                          </div>
                          {hub.rating != null && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                              {hub.rating.toFixed(1)}
                            </div>
                          )}
                        </div>

                        {hub.available_capacity_pct != null && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Capacity</span>
                              <span>{Math.round(hub.available_capacity_pct * 100)}% available</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-teal rounded-full"
                                style={{ width: `${Math.round(hub.available_capacity_pct * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => { e.stopPropagation(); navigate('/register') }}
                          >
                            Book
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })
            )}
          </div>

          {!isLoading && filtered.length > 0 && (
            <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 bg-white shrink-0">
              {filtered.length} hub{filtered.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Map — hidden on mobile */}
        <div className="hidden md:block flex-1 relative">
          {!isLoaded ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              Loading map…
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={center}
              zoom={13}
              options={MAP_OPTIONS}
              onLoad={onMapLoad}
            >
              {/* User location */}
              {lat != null && lng != null && (
                <Marker
                  position={{ lat, lng }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#007AFF',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                  }}
                />
              )}

              {/* Hub markers */}
              {filtered.map((hub) => {
                if (hub.lat == null || hub.lng == null) return null
                return (
                  <Marker
                    key={hub.id}
                    position={{ lat: hub.lat, lng: hub.lng }}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: hub.id === selectedHubId ? '#007AFF' : '#00C7BE',
                      fillOpacity: 1,
                      strokeColor: '#fff',
                      strokeWeight: 2,
                    }}
                    onClick={() => handleHubClick(hub.id, hub.lat!, hub.lng!)}
                  />
                )
              })}

              {/* InfoWindow for selected hub */}
              {selectedHub && selectedHub.lat != null && selectedHub.lng != null && (
                <InfoWindow
                  position={{ lat: selectedHub.lat + 0.0005, lng: selectedHub.lng }}
                  onCloseClick={() => setSelectedHubId(null)}
                >
                  <div className="p-1 min-w-[140px]">
                    <p className="font-semibold text-sm text-gray-900">{selectedHub.business_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedHub.distance_km?.toFixed(1)} km away
                    </p>
                    {selectedHub.rating != null && (
                      <p className="text-xs text-yellow-600 mt-1">★ {selectedHub.rating.toFixed(1)}</p>
                    )}
                    <button
                      className="mt-2 text-xs font-medium text-brand-blue"
                      onClick={() => navigate('/register')}
                    >
                      Book now →
                    </button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>
      </div>
    </div>
  )
}
