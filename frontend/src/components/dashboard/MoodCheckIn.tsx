import { useState, useEffect, useRef, useCallback } from 'react';
import type { MoodEntry } from '@/types/dashboard';
import type { MoodOption } from '@/constants/dashboard/mood';
import {
  MOOD_OPTIONS,
  MAX_MOOD_TEXT_LENGTH,
  VERSE_DISPLAY_DURATION_MS,
} from '@/constants/dashboard/mood';
import { containsCrisisKeyword, CRISIS_RESOURCES } from '@/constants/crisis-resources';
import { saveMoodEntry } from '@/services/mood-storage';
import { getLocalDateString } from '@/utils/date';
import { CharacterCount } from '@/components/ui/CharacterCount';
import { KaraokeTextReveal } from '@/components/daily/KaraokeTextReveal';
import { cn } from '@/lib/utils';
import { VerseLink } from '@/components/shared/VerseLink';
import { useSoundEffects } from '@/hooks/useSoundEffects';

type CheckInPhase = 'idle' | 'mood_selected' | 'verse_display' | 'crisis_banner';

interface MoodCheckInProps {
  userName: string;
  onComplete: (entry: MoodEntry) => void;
  onSkip: () => void;
}

export function MoodCheckIn({ userName, onComplete, onSkip }: MoodCheckInProps) {
  const { playSoundEffect } = useSoundEffects();
  const [phase, setPhase] = useState<CheckInPhase>('idle');
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [text, setText] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [verseRevealed, setVerseRevealed] = useState(false);
  const orbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const savedEntryRef = useRef<MoodEntry | null>(null);
  const verseRef = useRef<HTMLDivElement | null>(null);
  const crisisRef = useRef<HTMLDivElement | null>(null);

  // Move focus to new content on phase transition
  useEffect(() => {
    if (phase === 'verse_display') {
      verseRef.current?.focus();
    } else if (phase === 'crisis_banner') {
      crisisRef.current?.focus();
    }
  }, [phase]);

  // Auto-advance after verse display
  useEffect(() => {
    if (phase !== 'verse_display') return;
    const timer = setTimeout(() => {
      if (savedEntryRef.current) {
        onComplete(savedEntryRef.current);
      }
    }, VERSE_DISPLAY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  const handleMoodSelect = useCallback((mood: MoodOption, index: number) => {
    setSelectedMood(mood);
    setFocusedIndex(index);
    setPhase('mood_selected');
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedMood) return;

    const entry: MoodEntry = {
      id: crypto.randomUUID(),
      date: getLocalDateString(),
      mood: selectedMood.value,
      moodLabel: selectedMood.label,
      text: text.trim() || undefined,
      timestamp: Date.now(),
      verseSeen: selectedMood.verseReference,
      timeOfDay: 'morning',
    };

    saveMoodEntry(entry);
    savedEntryRef.current = entry;

    if (text.trim() && containsCrisisKeyword(text)) {
      setPhase('crisis_banner');
    } else {
      setVerseRevealed(false);
      setPhase('verse_display');
      playSoundEffect('chime');
    }
  }, [selectedMood, text, playSoundEffect]);

  const handleCrisisDismiss = useCallback(() => {
    if (savedEntryRef.current) {
      onComplete(savedEntryRef.current);
    }
  }, [onComplete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = MOOD_OPTIONS.length;
      let newIndex = focusedIndex;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        newIndex = (focusedIndex + 1) % len;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        newIndex = (focusedIndex - 1 + len) % len;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleMoodSelect(MOOD_OPTIONS[focusedIndex], focusedIndex);
        return;
      } else {
        return;
      }

      setFocusedIndex(newIndex);
      orbRefs.current[newIndex]?.focus();
    },
    [focusedIndex, handleMoodSelect]
  );

  const charCount = text.length;

  return (
    <div
      role="dialog"
      aria-labelledby="checkin-greeting"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]"
    >
      <div className="flex w-full max-w-[640px] flex-col items-center px-4">
        {(phase === 'idle' || phase === 'mood_selected') && (
          <div className="flex w-full flex-col items-center motion-safe:animate-fade-in">
            {/* Greeting */}
            <h1
              id="checkin-greeting"
              className="mb-8 text-center font-serif text-2xl text-white/90 md:mb-10 md:text-3xl"
            >
              How are you feeling today, {userName}?
            </h1>

            {/* Mood Orbs */}
            <div
              role="radiogroup"
              aria-label="Select your mood"
              className="flex max-w-[272px] flex-wrap justify-center gap-4 sm:max-w-none sm:gap-6"
              onKeyDown={handleKeyDown}
            >
              {MOOD_OPTIONS.map((mood, index) => {
                const isSelected = selectedMood?.value === mood.value;
                const hasSelection = selectedMood !== null;

                return (
                  <button
                    key={mood.value}
                    ref={(el) => {
                      orbRefs.current[index] = el;
                    }}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={mood.label}
                    tabIndex={focusedIndex === index ? 0 : -1}
                    onClick={() => handleMoodSelect(mood, index)}
                    className={`flex flex-col items-center gap-2 transition-all motion-reduce:transition-none duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded-xl ${
                      isSelected
                        ? 'scale-[1.15]'
                        : hasSelection
                          ? 'opacity-30'
                          : ''
                    }`}
                  >
                    <div
                      className={`h-14 w-14 rounded-full transition-all motion-reduce:transition-none duration-base sm:h-[60px] sm:w-[60px] lg:h-16 lg:w-16 ${
                        isSelected
                          ? ''
                          : !hasSelection
                            ? 'motion-safe:animate-mood-pulse'
                            : ''
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? mood.color
                          : `${mood.color}33`,
                        boxShadow: isSelected
                          ? `0 0 20px ${mood.color}, 0 0 40px ${mood.color}66`
                          : 'none',
                      }}
                    />
                    <span className="font-sans text-sm text-white/70">
                      {mood.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Text Input (slides in after mood selection) */}
            {phase === 'mood_selected' && (
              <div className="mt-6 w-full motion-safe:animate-fade-in">
                <label htmlFor="mood-text" className="sr-only">
                  Want to share what&apos;s on your heart?
                </label>
                <textarea
                  id="mood-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={MAX_MOOD_TEXT_LENGTH}
                  placeholder="Want to share what's on your heart?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/15 bg-white/5 p-4 text-white placeholder:text-white/50 focus:border-glow-cyan/50 focus:outline-none"
                  aria-label="Share what's on your heart"
                  aria-describedby="mood-char-count"
                />
                <div className="mt-1 text-right">
                  <CharacterCount current={charCount} max={MAX_MOOD_TEXT_LENGTH} warningAt={224} dangerAt={269} id="mood-char-count" />
                </div>

                {/* Continue Button */}
                <button
                  onClick={handleContinue}
                  className="mt-4 w-full rounded-lg bg-primary px-6 py-2 font-semibold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:w-auto"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Skip Link */}
            <button
              onClick={onSkip}
              className="mt-8 inline-flex min-h-[44px] items-center text-sm text-white/50 underline underline-offset-4 hover:text-white/70 focus-visible:text-white/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              Not right now
            </button>
          </div>
        )}

        {phase === 'verse_display' && selectedMood && (
          <div
            ref={verseRef}
            tabIndex={-1}
            aria-live="polite"
            className="flex flex-col items-center outline-none"
          >
            <div className="max-w-lg text-center font-serif text-xl italic text-white/90 md:text-2xl">
              &ldquo;<KaraokeTextReveal
                text={selectedMood.verse}
                revealDuration={2500}
                onRevealComplete={() => setVerseRevealed(true)}
                className="inline"
              />&rdquo;
            </div>
            <p
              className={cn(
                'mt-3 text-center font-sans text-sm transition-opacity motion-reduce:transition-none duration-base',
                verseRevealed ? 'opacity-100' : 'opacity-0'
              )}
            >
              <VerseLink
                reference={selectedMood.verseReference}
                className="text-white/50"
              />
            </p>
          </div>
        )}

        {phase === 'crisis_banner' && (
          <div
            ref={crisisRef}
            tabIndex={-1}
            className="flex flex-col items-center outline-none motion-safe:animate-fade-in"
          >
            <div
              role="alert"
              aria-live="assertive"
              className="w-full rounded-xl border border-warning/30 bg-warning/15 p-6"
            >
              <p className="mb-3 font-semibold text-white">
                If you&apos;re in crisis, help is available:
              </p>
              <ul className="space-y-2 text-white/80">
                <li>
                  <strong>{CRISIS_RESOURCES.suicide_prevention.name}:</strong>{' '}
                  <a
                    href="tel:988"
                    className="text-glow-cyan underline"
                  >
                    {CRISIS_RESOURCES.suicide_prevention.phone}
                  </a>
                </li>
                <li>
                  <strong>{CRISIS_RESOURCES.crisis_text.name}:</strong>{' '}
                  {CRISIS_RESOURCES.crisis_text.text}
                </li>
                <li>
                  <strong>{CRISIS_RESOURCES.samhsa.name}:</strong>{' '}
                  <a
                    href={`tel:${CRISIS_RESOURCES.samhsa.phone}`}
                    className="text-glow-cyan underline"
                  >
                    {CRISIS_RESOURCES.samhsa.phone}
                  </a>
                </li>
              </ul>
            </div>
            <button
              onClick={handleCrisisDismiss}
              className="mt-6 rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Continue to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
