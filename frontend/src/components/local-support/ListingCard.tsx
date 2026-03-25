import { Bookmark, ChevronDown, ExternalLink, ImageOff, MapPin, Phone, Share2, Star } from 'lucide-react'
import type { LocalSupportPlace, LocalSupportCategory } from '@/types/local-support'
import { VisitButton, VisitNote, useVisitState } from './VisitButton'
import { ListingCTAs } from './ListingCTAs'
import { cn } from '@/lib/utils'

interface ListingCardProps {
  place: LocalSupportPlace
  distance: number | null
  isBookmarked: boolean
  isHighlighted: boolean
  showBookmark?: boolean
  showVisitButton?: boolean
  onToggleBookmark: (placeId: string) => void
  onVisit?: (placeId: string, placeName: string) => void
  placeType?: 'church' | 'counselor' | 'cr'
  category?: LocalSupportCategory
  onShare: (placeId: string) => void
  onExpand: (placeId: string) => void
  isExpanded: boolean
  listId?: string
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return null
  const stars = []
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        size={14}
        aria-hidden="true"
        className={cn(
          i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-white/20',
        )}
      />,
    )
  }
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {stars}
      <span className="ml-1 text-xs text-white/50">{rating.toFixed(1)}</span>
    </div>
  )
}

export function ListingCard({
  place,
  distance,
  isBookmarked,
  isHighlighted,
  showBookmark = true,
  showVisitButton = false,
  onToggleBookmark,
  onVisit,
  placeType,
  category,
  onShare,
  onExpand,
  isExpanded,
  listId,
}: ListingCardProps) {
  const detailsId = listId ? `${listId}-${place.id}-details` : `${place.id}-details`

  // Always call hook (React rules); renders are conditional
  const visitState = useVisitState({
    placeId: place.id,
    placeName: place.name,
    placeType: placeType ?? 'church',
    onVisit: onVisit ?? (() => {}),
  })

  return (
    <article
      aria-label={`${place.name} — ${place.address}`}
      className={cn(
        'rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20',
        isHighlighted && 'ring-2 ring-primary',
      )}
    >
      {/* Main card content */}
      <div className="flex gap-4">
        {/* Photo or placeholder */}
        <div className="hidden shrink-0 sm:block">
          {place.photoUrl ? (
            <img
              src={place.photoUrl}
              alt={`Photo of ${place.name}`}
              className="h-20 w-20 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white/[0.06]">
              <ImageOff size={24} className="text-white/30" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">{place.name}</h3>
            {distance != null && (
              <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/50">
                {distance.toFixed(1)} mi
              </span>
            )}
          </div>

          <p className="mt-1 flex items-center gap-1 text-sm text-white/60">
            <MapPin size={14} className="shrink-0" aria-hidden="true" />
            {place.address}
          </p>

          {place.phone && (
            <p className="mt-1 flex items-center gap-1 text-sm">
              <Phone size={14} className="shrink-0 text-white/60" aria-hidden="true" />
              <a
                href={`tel:${place.phone}`}
                className="rounded text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {place.phone}
              </a>
            </p>
          )}

          <div className="mt-2">
            <StarRating rating={place.rating} />
          </div>
        </div>
      </div>

      {/* Actions row */}
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div className="flex items-center gap-2">
          {showBookmark && (
            <button
              type="button"
              aria-pressed={isBookmarked}
              aria-label={`Bookmark ${place.name}`}
              onClick={() => onToggleBookmark(place.id)}
              className="flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] transition-colors hover:bg-white/10"
            >
              <Bookmark
                size={18}
                aria-hidden="true"
                className={cn(
                  isBookmarked ? 'fill-success text-success' : 'text-white/50',
                )}
              />
            </button>
          )}
          <button
            type="button"
            aria-label={`Share ${place.name}`}
            onClick={() => onShare(place.id)}
            className="flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] transition-colors hover:bg-white/10"
          >
            <Share2 size={18} className="text-white/50" aria-hidden="true" />
          </button>
          {showVisitButton && onVisit && placeType && (
            <VisitButton visitState={visitState} />
          )}
        </div>

        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          aria-label={isExpanded ? `Collapse details for ${place.name}` : `Expand details for ${place.name}`}
          onClick={() => onExpand(place.id)}
          className="flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] transition-colors hover:bg-white/10"
        >
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={cn(
              'text-white/50 transition-transform duration-200',
              isExpanded && 'rotate-180',
            )}
          />
        </button>
      </div>

      {/* Visit note — rendered outside actions row for full card width */}
      {showVisitButton && onVisit && placeType && (
        <VisitNote visitState={visitState} />
      )}

      {/* Expanded details */}
      <div
        id={detailsId}
        {...(!isExpanded ? { inert: '' as unknown as string } : {})}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'mt-4 max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="space-y-3 border-t border-white/10 pt-4 text-sm">
          {place.website && (
            <p className="flex items-center gap-2">
              <ExternalLink size={14} className="shrink-0 text-white/60" aria-hidden="true" />
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Visit Website
              </a>
            </p>
          )}

          {place.hoursOfOperation && place.hoursOfOperation.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-white">Hours</p>
              <ul className="space-y-0.5 text-white/60">
                {place.hoursOfOperation.map((hours, i) => (
                  <li key={i}>{hours}</li>
                ))}
              </ul>
            </div>
          )}

          {place.category === 'churches' && place.denomination && (
            <p>
              <span className="font-medium text-white">Denomination:</span>{' '}
              <span className="text-white/60">{place.denomination}</span>
            </p>
          )}

          {place.category === 'counselors' && place.specialties && place.specialties.length > 0 && (
            <div>
              <span className="font-medium text-white">Specialties:</span>{' '}
              <span className="text-white/60">{place.specialties.join(', ')}</span>
            </div>
          )}

          {place.description && (
            <p className="text-white/60">{place.description}</p>
          )}

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
          >
            <MapPin size={14} aria-hidden="true" />
            Get Directions
          </a>

          {category && (
            <ListingCTAs
              placeName={place.name}
              category={category}
              onShareClick={() => onShare(place.id)}
            />
          )}
        </div>
      </div>
    </article>
  )
}
