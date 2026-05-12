/**
 * Session API types — Spec 1.5g.
 *
 * Shape matches the OpenAPI Session / SessionListResponse schemas at
 * backend/src/main/resources/openapi.yaml.
 *
 * NEVER exposes the JWT jti — that's the server-side blocklist key.
 * sessionId is the public revocation key for DELETE /api/v1/sessions/{id}.
 */
export interface Session {
  /** Public identifier — use as the path parameter for revoke. */
  sessionId: string
  /**
   * Parsed device label (major-version only). Example "Chrome 124 on macOS 14".
   * `null` or "Unknown device" when the UA was missing or unparseable.
   */
  deviceLabel: string | null
  /**
   * City derived from the login IP via MaxMind GeoLite2 (offline). `null`
   * when the IP is private/local/unknown or GeoIP DB unavailable. Never
   * lat/long; never raw IP.
   */
  ipCity: string | null
  /** Last-seen timestamp (ISO 8601). Updated at most once per 60s server-side. */
  lastSeenAt: string
  /** Session creation timestamp (ISO 8601). */
  createdAt: string
  /**
   * True when this session backs the current request's token. Server-derived
   * by comparing the row's jti against the authenticated principal's jti.
   */
  isCurrent: boolean
}
