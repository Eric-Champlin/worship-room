import { useState, useRef, useCallback, useEffect } from 'react'
import { MapPin, Search, Loader2 } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineMessage } from '@/components/pwa/OfflineMessage'

interface SearchControlsProps {
  onSearch: (lat: number, lng: number, radius: number) => void
  onGeocode: (query: string) => Promise<{ lat: number; lng: number } | null>
  initialLat?: number
  initialLng?: number
  initialRadius?: number
  isLoading: boolean
  onInteractionBlocked?: () => void
}

const MILE_MARKERS = [1, 25, 50, 75, 100]

export function SearchControls({
  onSearch,
  onGeocode,
  initialLat,
  initialLng,
  initialRadius,
  isLoading,
  onInteractionBlocked,
}: SearchControlsProps) {
  const { isOnline } = useOnlineStatus()
  const [locationInput, setLocationInput] = useState('')
  const [radius, setRadius] = useState(initialRadius ?? 25)
  const [coordsRef, setCoordsRef] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null,
  )
  const [geoMessage, setGeoMessage] = useState<string | null>(null)
  const [isGeolocating, setIsGeolocating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-search if initial coords are provided (from URL params) — fires once on mount (Q3)
  const hasAutoSearched = useRef(false)
  const initialRadiusRef = useRef(initialRadius ?? 25)
  useEffect(() => {
    if (initialLat != null && initialLng != null && !hasAutoSearched.current) {
      hasAutoSearched.current = true
      onSearch(initialLat, initialLng, initialRadiusRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoMessage('Geolocation is not supported by your browser. Enter your city or zip code instead.')
      return
    }

    setIsGeolocating(true)
    setGeoMessage(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setCoordsRef(coords)
        setIsGeolocating(false)
        setLocationInput('')
        onSearch(coords.lat, coords.lng, radius)
      },
      () => {
        setIsGeolocating(false)
        setGeoMessage('Location access denied — enter your city or zip code instead.')
      },
      { timeout: 10000 },
    )
  }, [radius, onSearch])

  const handleSearchSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!locationInput.trim()) return

      setGeoMessage(null)
      let result: { lat: number; lng: number } | null = null
      try {
        result = await onGeocode(locationInput.trim())
      } catch (_e) {
        setGeoMessage("Something went wrong. Please check your connection and try again.")
        return
      }
      if (result) {
        setCoordsRef(result)
        onSearch(result.lat, result.lng, radius)
      } else {
        setGeoMessage("We couldn't find that location. Please try a different city name or zip code.")
      }
    },
    [locationInput, radius, onSearch, onGeocode],
  )

  const handleRadiusChange = useCallback(
    (newRadius: number) => {
      setRadius(newRadius)
      if (coordsRef) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          onSearch(coordsRef.lat, coordsRef.lng, newRadius)
        }, 500)
      }
    },
    [coordsRef, onSearch],
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (!isOnline) {
    return <OfflineMessage variant="light" message="Search requires an internet connection" />
  }

  return (
    <div className="space-y-4">
      {/* Location input row */}
      <form onSubmit={onInteractionBlocked ? (e) => { e.preventDefault(); onInteractionBlocked() } : handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <button
          type="button"
          onClick={onInteractionBlocked ?? handleUseMyLocation}
          disabled={isGeolocating}
          aria-label="Use my current location"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-lt disabled:opacity-50"
        >
          {isGeolocating ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <MapPin size={18} aria-hidden="true" />
          )}
          <span className="sm:hidden lg:inline">Use My Location</span>
          <span className="hidden sm:inline lg:hidden">My Location</span>
        </button>

        <div className="flex flex-1 gap-2">
          <div className="flex-1">
            <label htmlFor="location-input" className="sr-only">
              City or zip code
            </label>
            <input
              id="location-input"
              type="text"
              placeholder="City or zip code"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              readOnly={!!onInteractionBlocked}
              onClick={onInteractionBlocked ? () => onInteractionBlocked() : undefined}
              aria-disabled={onInteractionBlocked ? true : undefined}
              {...(onInteractionBlocked ? { autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': true } as React.InputHTMLAttributes<HTMLInputElement> : {})}
              aria-describedby="location-geo-status"
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !locationInput.trim()}
            aria-label="Search"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-lt disabled:opacity-50"
          >
            <Search size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </form>

      {/* Geolocation message */}
      {geoMessage && (
        <p id="location-geo-status" className="text-sm text-white/60" role="status">
          {geoMessage}
        </p>
      )}

      {/* Radius slider */}
      <div>
        <label htmlFor="radius-slider" className="mb-1 block text-sm font-medium text-white/70">
          Search radius: {radius} mile{radius !== 1 ? 's' : ''}
        </label>
        <input
          id="radius-slider"
          type="range"
          min={1}
          max={100}
          step={1}
          value={radius}
          onChange={onInteractionBlocked ? (e) => e.preventDefault() : (e) => handleRadiusChange(Number(e.target.value))}
          onClick={onInteractionBlocked ? () => onInteractionBlocked() : undefined}
          onKeyDown={onInteractionBlocked ? (e) => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
              e.preventDefault()
              onInteractionBlocked()
            }
          } : undefined}
          aria-disabled={onInteractionBlocked ? true : undefined}
          aria-valuenow={radius}
          aria-valuemin={1}
          aria-valuemax={100}
          aria-label="Search radius"
          className="w-full accent-primary"
        />
        <div className="mt-1 flex justify-between text-xs text-white/40" aria-hidden="true">
          {MILE_MARKERS.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
