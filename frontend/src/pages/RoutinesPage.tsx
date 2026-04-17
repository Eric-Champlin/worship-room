import { useState, useCallback } from 'react'
import { Layout } from '@/components/Layout'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SEO } from '@/components/SEO'
import { MUSIC_ROUTINES_METADATA } from '@/lib/seo/routeMetadata'
import { HeadingDivider } from '@/components/HeadingDivider'
import { useElementWidth } from '@/hooks/useElementWidth'
import { RoutineCard } from '@/components/music/RoutineCard'
import { RoutineBuilder } from '@/components/music/RoutineBuilder'
import { DeleteRoutineDialog } from '@/components/music/DeleteRoutineDialog'
import { ROUTINE_TEMPLATES } from '@/data/music/routines'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useRoutinePlayer } from '@/hooks/useRoutinePlayer'
import { useToast } from '@/components/ui/Toast'
import { storageService } from '@/services/storage-service'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import type { RoutineDefinition } from '@/types/storage'

export function RoutinesPage() {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { startRoutine } = useRoutinePlayer()
  const { showToast } = useToast()

  const [userRoutines, setUserRoutines] = useState<RoutineDefinition[]>(() =>
    storageService.getRoutines(),
  )
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<RoutineDefinition | null>(null)
  const [deletingRoutine, setDeletingRoutine] = useState<RoutineDefinition | null>(null)
  const { ref: headingRef, width: headingWidth } = useElementWidth<HTMLHeadingElement>()

  const refreshRoutines = useCallback(() => {
    setUserRoutines(storageService.getRoutines())
  }, [])

  const handleCreate = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to create bedtime routines')
      return
    }
    setEditingRoutine(null)
    setShowBuilder(true)
  }

  const handleClone = (template: RoutineDefinition) => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to create bedtime routines')
      return
    }
    const now = new Date().toISOString()
    const cloned: RoutineDefinition = {
      ...template,
      id: crypto.randomUUID(),
      name: `${template.name} (Custom)`,
      isTemplate: false,
      steps: template.steps.map((s) => ({ ...s, id: crypto.randomUUID() })),
      createdAt: now,
      updatedAt: now,
    }
    setEditingRoutine(cloned)
    setShowBuilder(true)
  }

  const handleEdit = (routine: RoutineDefinition) => {
    setEditingRoutine(routine)
    setShowBuilder(true)
  }

  const handleDuplicate = (routine: RoutineDefinition) => {
    const copy = storageService.duplicateRoutine(routine.id)
    if (copy) {
      refreshRoutines()
      showToast(`Duplicated "${routine.name}"`)
    }
  }

  const handleDelete = () => {
    if (!deletingRoutine) return
    storageService.deleteRoutine(deletingRoutine.id)
    refreshRoutines()
    showToast(`Deleted "${deletingRoutine.name}"`)
    setDeletingRoutine(null)
  }

  const handleSave = (
    data: Omit<RoutineDefinition, 'createdAt' | 'updatedAt'>,
  ) => {
    const now = new Date().toISOString()
    const routine: RoutineDefinition = {
      ...data,
      createdAt: editingRoutine?.createdAt ?? now,
      updatedAt: now,
    }

    if (editingRoutine && userRoutines.some((r) => r.id === editingRoutine.id)) {
      storageService.updateRoutine(routine)
    } else {
      storageService.saveRoutine(routine)
    }

    refreshRoutines()
    setShowBuilder(false)
    setEditingRoutine(null)
    showToast(`Saved "${routine.name}"`)
  }

  const allRoutines = [...ROUTINE_TEMPLATES, ...userRoutines]

  return (
    <Layout>
      <SEO {...MUSIC_ROUTINES_METADATA} />
      {/* Hero */}
      <section
        className="px-4 pt-32 pb-8 text-center sm:pt-36 sm:pb-12 lg:pt-40"
        style={ATMOSPHERIC_HERO_BG}
      >
        <h1
          ref={headingRef}
          className="px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2"
          style={GRADIENT_TEXT_STYLE}
        >
          Bedtime <span className="font-script">Routines</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg font-serif italic text-base text-white/60 sm:text-lg">
          Build your path to peaceful sleep
        </p>
        <div className="mt-1 flex justify-center">
          <HeadingDivider width={headingWidth} />
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <Breadcrumb
          items={[
            { label: 'Music', href: '/music' },
            { label: 'Bedtime Routines' },
          ]}
          maxWidth="max-w-5xl"
        />
      </div>

      {/* Content */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        {showBuilder ? (
          <RoutineBuilder
            initial={editingRoutine}
            onSave={handleSave}
            onCancel={() => {
              setShowBuilder(false)
              setEditingRoutine(null)
            }}
          />
        ) : (
          <>
            {/* Routine cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allRoutines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onStart={() => startRoutine(routine)}
                  onClone={
                    routine.isTemplate ? () => handleClone(routine) : undefined
                  }
                  onEdit={!routine.isTemplate ? () => handleEdit(routine) : undefined}
                  onDuplicate={
                    !routine.isTemplate ? () => handleDuplicate(routine) : undefined
                  }
                  onDelete={
                    !routine.isTemplate
                      ? () => setDeletingRoutine(routine)
                      : undefined
                  }
                />
              ))}
            </div>

            {/* Create button */}
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={handleCreate}
                className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
              >
                Create Routine
              </button>
            </div>
          </>
        )}
      </section>

      {/* Delete confirmation */}
      {deletingRoutine && (
        <DeleteRoutineDialog
          routineName={deletingRoutine.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingRoutine(null)}
        />
      )}
    </Layout>
  )
}
