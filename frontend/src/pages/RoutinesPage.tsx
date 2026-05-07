import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SEO } from '@/components/SEO'
import { MUSIC_ROUTINES_METADATA } from '@/lib/seo/routeMetadata'
import { RoutineCard } from '@/components/music/RoutineCard'
import { RoutineBuilder } from '@/components/music/RoutineBuilder'
import { DeleteRoutineDialog } from '@/components/music/DeleteRoutineDialog'
import { ROUTINE_TEMPLATES } from '@/data/music/routines'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useRoutinePlayer } from '@/hooks/useRoutinePlayer'
import { useAudioState } from '@/components/audio/AudioProvider'
import { useToast } from '@/components/ui/Toast'
import { storageService } from '@/services/storage-service'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import type { RoutineDefinition } from '@/types/storage'

export function RoutinesPage() {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { startRoutine, endRoutine } = useRoutinePlayer()
  const audioState = useAudioState()
  const { showToast } = useToast()

  const [userRoutines, setUserRoutines] = useState<RoutineDefinition[]>(() =>
    storageService.getRoutines(),
  )
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<RoutineDefinition | null>(null)
  const [deletingRoutine, setDeletingRoutine] = useState<RoutineDefinition | null>(null)

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

    // If the user is deleting the actively-playing routine, end it first so the
    // AudioPill / AudioDrawer don't continue claiming "Currently in routine: <name>"
    // against an orphaned reference. endRoutine() dispatches END_ROUTINE which clears
    // state.activeRoutine and tears down player refs/timers via useRoutinePlayer.
    if (audioState.activeRoutine?.routineId === deletingRoutine.id) {
      endRoutine()
    }

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

  const hasUserRoutines = userRoutines.length > 0

  const renderRoutineCard = (routine: RoutineDefinition) => (
    <RoutineCard
      key={routine.id}
      routine={routine}
      onStart={() => startRoutine(routine)}
      onClone={routine.isTemplate ? () => handleClone(routine) : undefined}
      onEdit={!routine.isTemplate ? () => handleEdit(routine) : undefined}
      onDuplicate={!routine.isTemplate ? () => handleDuplicate(routine) : undefined}
      onDelete={!routine.isTemplate ? () => setDeletingRoutine(routine) : undefined}
    />
  )

  return (
    <Layout>
      <SEO {...MUSIC_ROUTINES_METADATA} />
      {/* Hero */}
      <section
        className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center sm:pt-36 sm:pb-12 lg:pt-40"
        style={ATMOSPHERIC_HERO_BG}
      >
        <Link
          to="/music"
          className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Music
        </Link>
        <h1
          className="px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2"
          style={GRADIENT_TEXT_STYLE}
        >
          Bedtime Routines
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg">
          End your day in stillness.
        </p>
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
            {hasUserRoutines && (
              <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 mt-4">
                Templates
              </h2>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ROUTINE_TEMPLATES.map(renderRoutineCard)}
            </div>

            {hasUserRoutines && (
              <>
                <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 mt-8 sm:mt-10">
                  Your routines
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {userRoutines.map(renderRoutineCard)}
                </div>
              </>
            )}

            {!hasUserRoutines && (
              <p className="text-white/60 text-sm sm:text-base text-center mt-6 mb-4">
                Tap a template to start, or create your own.
              </p>
            )}

            {/* Create button */}
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
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
