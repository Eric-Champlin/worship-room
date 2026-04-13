import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/utils'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import type { ReaderSettings } from '@/hooks/useReaderSettings'
import type { FocusModeSettings } from '@/hooks/useFocusMode'

interface TypographySheetProps {
  isOpen: boolean
  onClose: () => void
  settings: ReaderSettings
  onUpdate: <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void
  onReset: () => void
  anchorRef?: React.RefObject<HTMLButtonElement | null>
  focusSettings: FocusModeSettings
  onFocusSettingUpdate: <K extends keyof FocusModeSettings>(key: K, value: FocusModeSettings[K]) => void
}

const THEMES: Array<{ value: ReaderSettings['theme']; label: string; bg: string; text: string }> = [
  { value: 'midnight', label: 'Midnight', bg: '#08051A', text: 'rgba(255,255,255,0.9)' },
  { value: 'parchment', label: 'Parchment', bg: '#F5F0E8', text: '#3E2C1A' },
  { value: 'sepia', label: 'Sepia', bg: '#E8D5B7', text: '#2C1A0A' },
]

const SIZES: Array<{ value: ReaderSettings['typeSize']; label: string }> = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
  { value: 'xl', label: 'XL' },
]

const LINE_HEIGHTS: Array<{ value: ReaderSettings['lineHeight']; label: string }> = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
]

const FONTS: Array<{ value: ReaderSettings['fontFamily']; label: string; className: string }> = [
  { value: 'serif', label: 'Serif', className: 'font-serif' },
  { value: 'sans', label: 'Sans', className: 'font-sans' },
]

const FOCUS_DELAYS: Array<{ value: string; label: string }> = [
  { value: '3000', label: '3s' },
  { value: '6000', label: '6s' },
  { value: '12000', label: '12s' },
]

const PANEL_STYLE = {
  background: 'rgba(15, 10, 30, 0.95)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
} as const

export function TypographySheet({
  isOpen,
  onClose,
  settings,
  onUpdate,
  onReset,
  anchorRef,
  focusSettings,
  onFocusSettingUpdate,
}: TypographySheetProps) {
  const containerRef = useFocusTrap(isOpen, onClose)
  const panelRef = useRef<HTMLDivElement>(null)

  // Click-outside for desktop floating panel
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    const mq = window.matchMedia('(min-width: 1024px)')
    if (mq.matches) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, anchorRef])

  // Scroll lock on mobile only
  useEffect(() => {
    if (!isOpen) return

    const mq = window.matchMedia('(min-width: 1024px)')
    if (mq.matches) return

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop scrim — mobile/tablet only */}
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Single panel — responsive positioning */}
      <div
        ref={(el) => {
          /* eslint-disable no-extra-semi */
          ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
          ;(panelRef as React.MutableRefObject<HTMLDivElement | null>).current = el
          /* eslint-enable no-extra-semi */
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Typography settings"
        className={cn(
          'fixed z-50 overflow-y-auto border border-white/10',
          // Mobile/Tablet: bottom sheet
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t motion-safe:animate-bottom-sheet-slide-in',
          // Desktop: floating panel
          'lg:inset-x-auto lg:bottom-auto lg:top-16 lg:right-20 lg:max-h-[calc(100vh-5rem)] lg:w-[320px] lg:rounded-2xl lg:border lg:animate-none',
        )}
        style={PANEL_STYLE}
      >
        <div className="space-y-6 p-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Typography
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close typography settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Reading Theme */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Theme
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onUpdate('theme', t.value)}
                  className={cn(
                    'aspect-[3/2] w-full rounded-xl border-2 transition-all motion-reduce:transition-none',
                    settings.theme === t.value
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-white/10 hover:border-white/20',
                  )}
                  style={{ background: t.bg }}
                  aria-label={`${t.label} theme`}
                  aria-pressed={settings.theme === t.value}
                >
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-2">
                    <div
                      className="h-1 w-8 rounded-full"
                      style={{ background: t.text, opacity: 0.6 }}
                    />
                    <div
                      className="h-1 w-6 rounded-full"
                      style={{ background: t.text, opacity: 0.4 }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Type Size */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Size
            </h3>
            <SegmentedControl
              options={SIZES}
              value={settings.typeSize}
              onChange={(v) => onUpdate('typeSize', v)}
            />
          </section>

          {/* Line Height */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Line Height
            </h3>
            <SegmentedControl
              options={LINE_HEIGHTS}
              value={settings.lineHeight}
              onChange={(v) => onUpdate('lineHeight', v)}
            />
          </section>

          {/* Font Family */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Font
            </h3>
            <SegmentedControl
              options={FONTS.map((f) => ({
                ...f,
                label: <span className={f.className}>{f.label}</span>,
              }))}
              value={settings.fontFamily}
              onChange={(v) => onUpdate('fontFamily', v)}
            />
          </section>

          {/* Reset */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onReset}
              className="text-sm text-white/50 underline transition-colors hover:text-white/70"
            >
              Reset to defaults
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Focus Mode Section */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Focus mode
            </h3>

            {/* Enabled toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Enabled</span>
              <ToggleSwitch
                checked={focusSettings.enabled}
                onChange={(v) => onFocusSettingUpdate('enabled', v)}
                label="Focus mode enabled"
              />
            </div>

            {/* Timing — only visible when enabled */}
            {focusSettings.enabled && (
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-medium text-white/40">Timing</h4>
                <SegmentedControl
                  options={FOCUS_DELAYS}
                  value={String(focusSettings.delay)}
                  onChange={(v) => onFocusSettingUpdate('delay', Number(v))}
                />
              </div>
            )}

            {/* Dim orbs toggle — only visible when enabled */}
            {focusSettings.enabled && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-white/70">Dim orbs in focus</span>
                <ToggleSwitch
                  checked={focusSettings.dimOrbs}
                  onChange={(v) => onFocusSettingUpdate('dimOrbs', v)}
                  label="Dim orbs in focus mode"
                />
              </div>
            )}

            {/* Caption */}
            <p className="mt-3 text-xs leading-relaxed text-white/40">
              The chrome fades when you're still. Move or tap to bring it back.
            </p>
          </section>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Background Sound Section (BB-20) */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Background sound
            </h3>

            {/* Show audio control toggle */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-white/70">Show audio control</span>
              <ToggleSwitch
                checked={settings.ambientAudioVisible}
                onChange={(v) => onUpdate('ambientAudioVisible', v)}
                label="Show audio control in reader"
              />
            </div>

            {/* Auto-start toggle */}
            <div
              className={cn(
                'flex items-center justify-between py-2',
                !settings.ambientAudioVisible && 'pointer-events-none opacity-40',
              )}
            >
              <span className="text-sm text-white/70">Auto-start on chapter open</span>
              <ToggleSwitch
                checked={settings.ambientAudioAutoStart}
                onChange={(v) => onUpdate('ambientAudioAutoStart', v)}
                label="Auto-start sound when opening a chapter"
              />
            </div>

            {/* Default sound picker (visible only when auto-start is on) */}
            {settings.ambientAudioAutoStart && (
              <div className="py-2">
                <span className="mb-2 block text-sm text-white/60">Default sound</span>
                <SoundPicker
                  value={settings.ambientAudioAutoStartSound}
                  onChange={(id) => onUpdate('ambientAudioAutoStartSound', id)}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

// --- Segmented Control sub-component ---

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: React.ReactNode }>
  value: T
  onChange: (value: T) => void
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex rounded-full border border-white/10 bg-white/[0.06] p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors min-h-[36px]',
            value === opt.value
              ? 'bg-white/[0.15] text-white'
              : 'text-white/50 hover:text-white/70',
          )}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// --- Sound Picker sub-component (BB-20) ---

const SOUND_PICKER_OPTIONS: Array<{ id: string | null; label: string }> = [
  { id: null, label: 'Last played sound' },
  ...['gentle-rain', 'ocean-waves', 'fireplace', 'soft-piano'].map((id) => ({
    id,
    label: SOUND_BY_ID.get(id)?.name ?? id,
  })),
]

function SoundPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SOUND_PICKER_OPTIONS.map((opt) => (
        <button
          key={opt.id ?? 'last-played'}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs transition-colors',
            value === opt.id
              ? 'bg-primary text-white'
              : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.10] hover:text-white',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// --- Toggle Switch sub-component ---

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        checked ? 'bg-primary' : 'bg-white/20',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}
