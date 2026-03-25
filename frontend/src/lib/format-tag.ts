/**
 * Formats a tag value string for display: replaces underscores with spaces
 * and capitalizes the first letter of each word.
 *
 * Extracted from the now-deleted AmbientFilterBar component because SceneCard
 * still uses this utility.
 */
export function formatTagValue(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
