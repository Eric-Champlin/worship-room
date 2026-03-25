import { useState, useCallback } from 'react'
import { Layout } from '@/components/Layout'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { SEO } from '@/components/SEO'
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
      <SEO title="Bedtime Routines" description="Wind down with guided bedtime routines combining Scripture, ambient sounds, and gentle prayers." />
      {/* Hero */}
      <section
        className="px-4 pt-32 pb-8 text-center sm:pt-36 sm:pb-12 lg:pt-40"
        style={ATMOSPHERIC_HERO_BG}
      >
        <h1
          ref={headingRef}
          className="font-script text-3xl font-bold bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
        >
          Bedtime Routines
        </h1>
        <p className="mx-auto mt-4 max-w-lg font-serif italic text-base text-white/60 sm:text-lg">
          Build your path to peaceful sleep
        </p>
        <div className="mt-1 flex justify-center">
          <HeadingDivider width={headingWidth} />
        </div>
      </section>

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
                className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
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
