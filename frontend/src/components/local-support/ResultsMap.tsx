import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { LocalSupportPlace } from '@/types/local-support'

// Fix Leaflet default marker icon (Vite bundling issue).
// Leaflet's type definitions don't expose the internal _getIconUrl property,
// so we must cast through `any` to delete it before overriding with explicit paths.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

interface ResultsMapProps {
  places: LocalSupportPlace[]
  center: { lat: number; lng: number }
  selectedPlaceId: string | null
  onSelectPlace: (placeId: string) => void
  distanceMap?: Map<string, number>
}

function MapUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom())
  }, [center, map])
  return null
}

function SelectedMarkerOpener({ selectedPlaceId, places }: { selectedPlaceId: string | null; places: LocalSupportPlace[] }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedPlaceId) return
    const place = places.find((p) => p.id === selectedPlaceId)
    if (!place) return

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const latLng = layer.getLatLng()
        if (
          Math.abs(latLng.lat - place.lat) < 0.0001 &&
          Math.abs(latLng.lng - place.lng) < 0.0001
        ) {
          layer.openPopup()
        }
      }
    })
  }, [selectedPlaceId, places, map])
  return null
}

export function ResultsMap({
  places,
  center,
  selectedPlaceId,
  onSelectPlace,
  distanceMap,
}: ResultsMapProps) {
  return (
    <div
      className="h-[400px] w-full overflow-hidden rounded-xl border border-gray-200 lg:h-full"
      role="region"
      aria-label={`Map showing ${places.length} location${places.length !== 1 ? 's' : ''}`}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={10}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} />
        <SelectedMarkerOpener selectedPlaceId={selectedPlaceId} places={places} />

        {places.map((place) => {
          const dist = distanceMap?.get(place.id)
          return (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              eventHandlers={{
                click: () => onSelectPlace(place.id),
              }}
            >
              <Popup>
                <div className="min-w-[160px] font-sans">
                  <p className="text-sm font-semibold text-text-dark">{place.name}</p>
                  <p className="mt-0.5 text-xs text-text-light">{place.address}</p>
                  {dist != null && (
                    <p className="mt-0.5 text-xs text-primary">
                      {dist.toFixed(1)} miles away
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectPlace(place.id)}
                    className="mt-2 rounded text-xs font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
