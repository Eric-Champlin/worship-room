import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance'
import { Navigate } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { PageHero } from '@/components/PageHero'
import { SEO } from '@/components/SEO'
import { MY_PRAYERS_METADATA } from '@/lib/seo/routeMetadata'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import type { FaithfulnessScripture } from '@/constants/faithfulness-scriptures'
import { PrayerListActionBar } from '@/components/my-prayers/PrayerListActionBar'
import { PrayerComposer } from '@/components/my-prayers/PrayerComposer'
import { PrayerItemCard } from '@/components/my-prayers/PrayerItemCard'
import { PrayerCardActions } from '@/components/my-prayers/PrayerCardActions'
import { PrayerCardOverflowMenu } from '@/components/my-prayers/PrayerCardOverflowMenu'
import { EditPrayerForm } from '@/components/my-prayers/EditPrayerForm'
import { MarkAnsweredForm } from '@/components/my-prayers/MarkAnsweredForm'
import { DeletePrayerDialog } from '@/components/my-prayers/DeletePrayerDialog'
import { PrayerListEmptyState } from '@/components/my-prayers/PrayerListEmptyState'
import { PrayerAnsweredCelebration } from '@/components/my-prayers/PrayerAnsweredCelebration'
import { TestimonyShareActions } from '@/components/my-prayers/TestimonyShareActions'
import {
  getPrayers,
  addPrayer,
  updatePrayer,
  deletePrayer,
  markAnswered,
  markPrayed,
  updateReminder,
} from '@/services/prayer-list-storage'
import type { PersonalPrayer, PrayerListFilter } from '@/types/personal-prayer'
import type { PrayerCategory } from '@/constants/prayer-categories'

// Loading state: use MyPrayersSkeleton
export function MyPrayers() {
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const [prayers, setPrayers] = useState<PersonalPrayer[]>([])
  const [filter, setFilter] = useState<PrayerListFilter>('active')
  const [composerOpen, setComposerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [glowingId, setGlowingId] = useState<string | null>(null)
  const glowTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [celebrationPrayer, setCelebrationPrayer] = useState<{ title: string; note?: string } | null>(null)
  const [shareData, setShareData] = useState<{
    prayerTitle: string
    testimonyNote?: string
    scriptureText: string
    scriptureReference: string
  } | null>(null)

  useEffect(() => {
    return () => { if (glowTimerRef.current) clearTimeout(glowTimerRef.current) }
  }, [])

  // Load prayers from localStorage on mount
  useEffect(() => {
    setPrayers(getPrayers())
  }, [])

  const refreshPrayers = useCallback(() => {
    setPrayers(getPrayers())
  }, [])

  const filteredPrayers = useMemo(() => {
    let list = prayers
    if (filter === 'active') list = list.filter((p) => p.status === 'active')
    if (filter === 'answered') list = list.filter((p) => p.status === 'answered')
    return list.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [prayers, filter])

  const { containerRef: prayerListRef, getStaggerProps: getPrayerStaggerProps } =
    useStaggeredEntrance({ staggerDelay: 50, itemCount: filteredPrayers.length })

  const counts = useMemo(
    () => ({
      all: prayers.length,
      active: prayers.filter((p) => p.status === 'active').length,
      answered: prayers.filter((p) => p.status === 'answered').length,
    }),
    [prayers],
  )

  const handleAddPrayer = useCallback(
    (title: string, description: string, category: PrayerCategory) => {
      const result = addPrayer({ title, description, category })
      if (result) {
        refreshPrayers()
        setComposerOpen(false)
        showToast("Added to your prayer list. We'll keep it close.", 'success')
      } else {
        showToast(
          "You've reached the 200 prayer limit. Consider archiving answered prayers to make room.",
          'error',
        )
      }
    },
    [refreshPrayers, showToast],
  )

  const handleUpdatePrayer = useCallback(
    (id: string, updates: { title: string; description: string; category: PrayerCategory }) => {
      updatePrayer(id, updates)
      refreshPrayers()
      setEditingId(null)
      showToast('Prayer updated', 'success')
    },
    [refreshPrayers, showToast],
  )

  const handleDeletePrayer = useCallback(
    (id: string) => {
      deletePrayer(id)
      refreshPrayers()
      setDeletingId(null)
      showToast('Removed from your list.', 'success')
    },
    [refreshPrayers, showToast],
  )

  const handleMarkAnswered = useCallback(
    (id: string, note: string) => {
      // Capture prayer title before updating status
      const prayer = prayers.find((p) => p.id === id)
      const title = prayer?.title ?? 'Prayer'

      markAnswered(id, note || undefined)
      refreshPrayers()
      setAnsweringId(null)
      setCelebrationPrayer({ title, note: note || undefined })
    },
    [prayers, refreshPrayers],
  )

  const handlePray = useCallback(
    (id: string) => {
      markPrayed(id)
      refreshPrayers()

      // Check prefers-reduced-motion
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (!prefersReducedMotion) {
        setGlowingId(id)
        glowTimerRef.current = setTimeout(() => setGlowingId(null), 1000)
      }
    },
    [refreshPrayers],
  )

  const handleToggleReminder = useCallback(
    (id: string, enabled: boolean) => {
      updateReminder(id, enabled)
      refreshPrayers()
    },
    [refreshPrayers],
  )

  const handleReminderTimeChange = useCallback(
    (id: string, time: string) => {
      updateReminder(id, true, time)
      refreshPrayers()
    },
    [refreshPrayers],
  )

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-dashboard-dark">
      <SEO {...MY_PRAYERS_METADATA} />
      <Navbar transparent />
      <PageHero title="My Prayers" subtitle="Your personal conversation with God." scriptWord="Prayers" />

      {counts.answered > 0 && (
        <div className="bg-gradient-to-b from-[#4A1D96] to-dashboard-dark pb-6 text-center">
          <p className="text-base text-white/85">
            <span className="font-semibold text-emerald-400" data-testid="answered-count">
              {counts.answered}
            </span>{' '}
            {counts.answered === 1 ? 'prayer answered' : 'prayers answered'}
          </p>
          {counts.answered >= 5 && (
            <p className="mx-auto mt-2 max-w-md font-serif text-sm italic text-white/70">
              God is faithful. Keep bringing your requests to Him.
            </p>
          )}
        </div>
      )}

      <PrayerListActionBar
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        onAddPrayer={() => setComposerOpen(true)}
      />

      <main className="min-h-[50vh] px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <PrayerComposer
            isOpen={composerOpen}
            onClose={() => setComposerOpen(false)}
            onSave={handleAddPrayer}
          />

          {prayers.length === 0 ? (
            <PrayerListEmptyState onAddPrayer={() => setComposerOpen(true)} />
          ) : filteredPrayers.length === 0 ? (
            <p className="py-16 text-center text-white/50" role="status">
              No {filter} prayers
            </p>
          ) : (
            <div className="space-y-4" role="list" aria-label="Prayer list" ref={prayerListRef}>
              {filteredPrayers.map((prayer, index) => {
                const stagger = editingId === prayer.id ? { className: '', style: {} } : getPrayerStaggerProps(index)
                return editingId === prayer.id ? (
                  <div key={prayer.id} role="listitem">
                    <EditPrayerForm
                      prayer={prayer}
                      onSave={(updates) => handleUpdatePrayer(prayer.id, updates)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div key={prayer.id} role="listitem" className={stagger.className} style={stagger.style}>
                    <PrayerItemCard
                      prayer={prayer}
                      glowing={glowingId === prayer.id}
                      onToggleReminder={(enabled) => handleToggleReminder(prayer.id, enabled)}
                      onReminderTimeChange={(time) => handleReminderTimeChange(prayer.id, time)}
                    >
                      {answeringId === prayer.id ? (
                        <MarkAnsweredForm
                          onConfirm={(note) => handleMarkAnswered(prayer.id, note)}
                          onCancel={() => setAnsweringId(null)}
                        />
                      ) : (
                        <>
                          <PrayerCardActions
                            prayer={prayer}
                            onPray={() => handlePray(prayer.id)}
                            onEdit={() => setEditingId(prayer.id)}
                            onMarkAnswered={() => setAnsweringId(prayer.id)}
                            onDelete={() => setDeletingId(prayer.id)}
                          />
                          <PrayerCardOverflowMenu
                            prayer={prayer}
                            onPray={() => handlePray(prayer.id)}
                            onEdit={() => setEditingId(prayer.id)}
                            onMarkAnswered={() => setAnsweringId(prayer.id)}
                            onDelete={() => setDeletingId(prayer.id)}
                          />
                        </>
                      )}
                    </PrayerItemCard>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <DeletePrayerDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onDelete={() => deletingId && handleDeletePrayer(deletingId)}
      />

      <SiteFooter />

      {celebrationPrayer && (
        <PrayerAnsweredCelebration
          prayerTitle={celebrationPrayer.title}
          testimonyNote={celebrationPrayer.note}
          onDismiss={() => setCelebrationPrayer(null)}
          onShareRequest={(scripture: FaithfulnessScripture) => {
            setShareData({
              prayerTitle: celebrationPrayer.title,
              testimonyNote: celebrationPrayer.note,
              scriptureText: scripture.text,
              scriptureReference: scripture.reference,
            })
            setCelebrationPrayer(null)
          }}
        />
      )}

      {shareData && (
        <TestimonyShareActions
          isOpen={!!shareData}
          onClose={() => setShareData(null)}
          {...shareData}
        />
      )}
    </div>
  )
}
