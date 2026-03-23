import { describe, it, expect } from 'vitest'
import { getPrayerPrefill, getJournalPrompt, getMeditationSuggestion, getMusicDestination } from '../challenge-prefills'
import { SELF_HARM_KEYWORDS } from '@/constants/crisis-resources'

describe('challenge-prefills', () => {
  describe('getPrayerPrefill', () => {
    it('returns prayer starter with day number and title', () => {
      const result = getPrayerPrefill('Turning to God', 1)
      expect(result).toContain('Day 1')
      expect(result).toContain('Turning to God')
    })

    it('does not contain crisis keywords', () => {
      // Test all 40 possible days with sample titles
      const titles = [
        'Turning to God', 'Simplicity', 'Fasting', 'Gratitude', 'Forgiveness',
        'Trust', 'Hope', 'Love', 'Peace', 'Joy',
      ]
      for (let day = 1; day <= 40; day++) {
        const title = titles[day % titles.length]
        const prefill = getPrayerPrefill(title, day)
        for (const keyword of SELF_HARM_KEYWORDS) {
          expect(prefill.toLowerCase()).not.toContain(keyword.toLowerCase())
        }
      }
    })
  })

  describe('getJournalPrompt', () => {
    it('returns the daily action as the prompt', () => {
      expect(getJournalPrompt('Write about gratitude')).toBe('Write about gratitude')
    })
  })

  describe('getMeditationSuggestion', () => {
    it('returns /meditate/acts for pray action', () => {
      expect(getMeditationSuggestion('pray', 'Test')).toBe('/meditate/acts')
    })

    it('returns /meditate/gratitude for gratitude action', () => {
      expect(getMeditationSuggestion('gratitude', 'Test')).toBe('/meditate/gratitude')
    })

    it('returns /meditate/soaking for meditate action', () => {
      expect(getMeditationSuggestion('meditate', 'Test')).toBe('/meditate/soaking')
    })

    it('returns null for music action', () => {
      expect(getMeditationSuggestion('music', 'Test')).toBeNull()
    })
  })

  describe('getMusicDestination', () => {
    it('returns sleep tab for restful themes', () => {
      expect(getMusicDestination('A Night of Rest')).toBe('/music?tab=sleep')
      expect(getMusicDestination('Finding Peace')).toBe('/music?tab=sleep')
    })

    it('returns playlists tab for praise themes', () => {
      expect(getMusicDestination('Songs of Praise')).toBe('/music?tab=playlists')
      expect(getMusicDestination('Worship in Joy')).toBe('/music?tab=playlists')
    })

    it('returns ambient tab for nature/calm themes', () => {
      expect(getMusicDestination('Creation and Nature')).toBe('/music?tab=ambient')
      expect(getMusicDestination('Be Still and Know')).toBe('/music?tab=ambient')
    })

    it('returns /music for generic themes', () => {
      expect(getMusicDestination('Day of Reflection')).toBe('/music')
    })
  })
})
