import type { LucideIcon } from 'lucide-react'
import {
  CreditCard,
  EyeOff,
  HeartHandshake,
  LifeBuoy,
  ShieldOff,
  Sparkles,
} from 'lucide-react'

export interface DifferentiatorItem {
  icon: LucideIcon
  title: string
  description: string
}

export const DIFFERENTIATORS: DifferentiatorItem[] = [
  {
    icon: ShieldOff,
    title: 'Your time is sacred',
    description:
      'No ads. No sponsored content. No interruptions. When you open Worship Room, the only voice is yours.',
  },
  {
    icon: EyeOff,
    title: 'Your conversations stay private',
    description:
      "We don't sell your data or share your journal entries with anyone. Your spiritual life is private. Period.",
  },
  {
    icon: CreditCard,
    title: 'Honest from day one',
    description:
      "No hidden fees, no auto-renewing traps, no paywall that appears after you've invested your heart.",
  },
  {
    icon: HeartHandshake,
    title: "We'll never guilt you for missing a day",
    description:
      "Life happens. Your streak has gentle repair, your garden doesn't wilt, and when you come back, we welcome you back.",
  },
  {
    icon: Sparkles,
    title: 'AI That Meets You Where You Are',
    description:
      "Share how you're feeling and receive a personalized prayer. Ask questions about Scripture. Journal and receive reflections.",
  },
  {
    icon: LifeBuoy,
    title: 'A safe space when it matters most',
    description:
      "If you're in crisis, we connect you with the 988 Lifeline, Crisis Text Line, and SAMHSA. Help is always here.",
  },
]
