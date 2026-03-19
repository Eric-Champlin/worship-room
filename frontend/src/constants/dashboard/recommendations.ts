import type { MoodValue } from '@/types/dashboard'

export interface MoodRecommendation {
  title: string
  description: string
  icon: string
  route: string
}

export const MOOD_RECOMMENDATIONS: Record<MoodValue, MoodRecommendation[]> = {
  1: [
    {
      title: 'Talk to God',
      description: 'Let prayer carry what feels too heavy to hold.',
      icon: 'HandHeart',
      route: '/daily?tab=pray',
    },
    {
      title: 'Find Comfort in Scripture',
      description: 'Rest in words that have held others through the storm.',
      icon: 'BookOpen',
      route: '/music?tab=sleep',
    },
    {
      title: "You're Not Alone",
      description: 'See how others are lifting each other up right now.',
      icon: 'Users',
      route: '/prayer-wall',
    },
  ],
  2: [
    {
      title: 'Write It Out',
      description: 'Sometimes the weight lifts when you put it into words.',
      icon: 'PenLine',
      route: '/daily?tab=journal',
    },
    {
      title: 'Breathe and Be Still',
      description: 'A quiet moment to slow down and just breathe.',
      icon: 'Wind',
      route: '/daily?tab=meditate',
    },
    {
      title: 'Listen to Calming Sounds',
      description: 'Let gentle sounds create space for peace.',
      icon: 'Headphones',
      route: '/music?tab=ambient',
    },
  ],
  3: [
    {
      title: 'Reflect on Your Day',
      description: 'Take a few minutes to notice what God is doing.',
      icon: 'PenLine',
      route: '/daily?tab=journal',
    },
    {
      title: 'Worship with Music',
      description: 'Let worship shift your focus and lift your spirit.',
      icon: 'Music',
      route: '/music?tab=playlists',
    },
    {
      title: 'Explore a Meditation',
      description: 'A guided moment of stillness and presence.',
      icon: 'Sparkles',
      route: '/daily?tab=meditate',
    },
  ],
  4: [
    {
      title: 'Give Thanks',
      description: 'Gratitude turns what you have into more than enough.',
      icon: 'Heart',
      route: '/meditate/gratitude',
    },
    {
      title: 'Encourage Someone',
      description: 'Your words could be exactly what someone needs today.',
      icon: 'MessageCircleHeart',
      route: '/prayer-wall',
    },
    {
      title: 'Deepen Your Worship',
      description: "Let music draw you closer to God's heart.",
      icon: 'Music',
      route: '/music?tab=playlists',
    },
  ],
  5: [
    {
      title: 'Celebrate with Worship',
      description: 'Let your joy overflow into praise.',
      icon: 'Music',
      route: '/music?tab=playlists',
    },
    {
      title: 'Share Your Joy',
      description: 'Spread encouragement to those who need it most.',
      icon: 'Megaphone',
      route: '/prayer-wall',
    },
    {
      title: 'Pour into Others',
      description: 'Your strength today can lift someone else up.',
      icon: 'HeartHandshake',
      route: '/friends',
    },
  ],
}
