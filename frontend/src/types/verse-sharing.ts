export type ShareTemplate = 'classic' | 'radiant' | 'nature' | 'bold'
export type ShareSize = 'square' | 'story' | 'wide'

export interface ShareSizeDimensions {
  width: number
  height: number
  label: string
  hint: string
}
