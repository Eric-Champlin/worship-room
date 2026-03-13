import { describe, expect, it } from 'vitest'
import { ROUTINE_TEMPLATES } from '../routines'
import { SCENE_PRESETS } from '@/data/scenes'
import { SCRIPTURE_READING_BY_ID, SCRIPTURE_COLLECTIONS } from '../scripture-readings'
import { BEDTIME_STORY_BY_ID } from '../bedtime-stories'

const SCENE_IDS = new Set(SCENE_PRESETS.map((s) => s.id))
const COLLECTION_IDS = new Set(SCRIPTURE_COLLECTIONS.map((c) => c.id))

describe('Routine Templates Data', () => {
  it('has 3 templates', () => {
    expect(ROUTINE_TEMPLATES).toHaveLength(3)
  })

  it('all templates have isTemplate: true', () => {
    for (const template of ROUTINE_TEMPLATES) {
      expect(template.isTemplate).toBe(true)
    }
  })

  it('all template IDs are unique and prefixed with "template-"', () => {
    const ids = ROUTINE_TEMPLATES.map((t) => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
    for (const id of ids) {
      expect(id).toMatch(/^template-/)
    }
  })

  it('all templates have a name and description', () => {
    for (const template of ROUTINE_TEMPLATES) {
      expect(template.name.trim().length).toBeGreaterThan(0)
      expect(template.description?.trim().length).toBeGreaterThan(0)
    }
  })

  it('all templates have at least 2 steps', () => {
    for (const template of ROUTINE_TEMPLATES) {
      expect(template.steps.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('all template step contentIds reference valid data', () => {
    for (const template of ROUTINE_TEMPLATES) {
      for (const step of template.steps) {
        switch (step.type) {
          case 'scene':
            expect(SCENE_IDS.has(step.contentId)).toBe(true)
            break
          case 'scripture':
            // Can reference a specific reading ID or a collection ID (resolved at start time)
            expect(
              SCRIPTURE_READING_BY_ID.has(step.contentId) ||
                COLLECTION_IDS.has(step.contentId),
            ).toBe(true)
            break
          case 'story':
            expect(BEDTIME_STORY_BY_ID.has(step.contentId)).toBe(true)
            break
        }
      }
    }
  })

  it('first step of each template has transitionGapMinutes of 0', () => {
    for (const template of ROUTINE_TEMPLATES) {
      expect(template.steps[0].transitionGapMinutes).toBe(0)
    }
  })

  it('all templates have valid sleep timer config', () => {
    for (const template of ROUTINE_TEMPLATES) {
      expect(template.sleepTimer.durationMinutes).toBeGreaterThan(0)
      expect(template.sleepTimer.fadeDurationMinutes).toBeGreaterThan(0)
      expect(template.sleepTimer.fadeDurationMinutes).toBeLessThan(
        template.sleepTimer.durationMinutes,
      )
    }
  })

  it('all step IDs are unique within each template', () => {
    for (const template of ROUTINE_TEMPLATES) {
      const stepIds = template.steps.map((s) => s.id)
      const uniqueStepIds = new Set(stepIds)
      expect(uniqueStepIds.size).toBe(stepIds.length)
    }
  })
})
