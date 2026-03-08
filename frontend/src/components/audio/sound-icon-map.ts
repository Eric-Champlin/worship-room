import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Bird,
  Bug,
  Church,
  Circle,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  Coffee,
  Droplets,
  Flame,
  Flower2,
  Guitar,
  Music,
  Music2,
  Music3,
  Piano,
  Sparkles,
  Tent,
  Waves,
  Wind,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Bell,
  Bird,
  Bug,
  Church,
  Circle,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  Coffee,
  Droplets,
  Flame,
  Flower2,
  Guitar,
  Music,
  Music2,
  Music3,
  Piano,
  Sparkles,
  Tent,
  Waves,
  Wind,
}

/** Resolve a Lucide icon name string to a React component. Falls back to Music icon. */
export function getSoundIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? Music
}
