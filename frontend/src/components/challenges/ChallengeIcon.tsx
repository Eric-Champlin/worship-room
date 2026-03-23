import { Heart, Sun, Flame, Star, Leaf, type LucideIcon, type LucideProps } from 'lucide-react'

const CHALLENGE_ICON_MAP: Record<string, LucideIcon> = { Heart, Sun, Flame, Star, Leaf }

interface ChallengeIconProps extends Omit<LucideProps, 'ref'> {
  name: string
}

export function ChallengeIcon({ name, ...props }: ChallengeIconProps) {
  const Icon = CHALLENGE_ICON_MAP[name]
  if (!Icon) return null
  return <Icon {...props} />
}
