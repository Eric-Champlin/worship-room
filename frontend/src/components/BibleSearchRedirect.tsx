import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * BB-38: Redirects legacy `/bible/search` URLs to `/bible?mode=search`.
 *
 * The spec's deep-link form is `/bible/search?q=love`, but Bible search is
 * architecturally a sub-mode of `/bible` (consumed by `BibleLanding` via the
 * `useSearchQuery` hook + a `?mode=search` reader). Rather than build a
 * parallel search page, BB-38 keeps the legacy path alive as a redirect that
 * forwards the `?q=` parameter onto the canonical URL.
 *
 * `replace` is set to true so back-navigation from `/bible` doesn't loop
 * through the redirect.
 */
export function BibleSearchRedirect() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q')
  const target = q
    ? `/bible?mode=search&q=${encodeURIComponent(q)}`
    : '/bible?mode=search'
  return <Navigate to={target} replace />
}
