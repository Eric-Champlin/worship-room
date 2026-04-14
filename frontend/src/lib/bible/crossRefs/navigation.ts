/** Build the route path for navigating to a cross-reference.
 *  Single seam for BB-38 to upgrade with #v{verse} anchoring later. */
export function buildCrossRefRoute(bookSlug: string, chapter: number, _verse: number): string {
  // BB-38 will change this to include #v{verse} anchoring
  return `/bible/${bookSlug}/${chapter}`
}
