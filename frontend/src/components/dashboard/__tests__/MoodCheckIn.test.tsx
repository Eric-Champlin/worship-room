import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MoodCheckIn } from '../MoodCheckIn';
import { MOOD_OPTIONS } from '@/constants/dashboard/mood';
import { useReducedMotion } from '@/hooks/useReducedMotion';

vi.mock('@/hooks/useReducedMotion');

const mockOnComplete = vi.fn();
const mockOnSkip = vi.fn();

function renderCheckIn(userName = 'Eric') {
  return render(
    <MemoryRouter>
      <MoodCheckIn
        userName={userName}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(useReducedMotion).mockReturnValue(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MoodCheckIn', () => {
  describe('Initial Render', () => {
    it('renders greeting with user name', () => {
      renderCheckIn('Eric');
      expect(
        screen.getByText(/How are you feeling today, Eric\?/i)
      ).toBeInTheDocument();
    });

    it('renders all 5 mood orbs with correct labels', () => {
      renderCheckIn();
      expect(screen.getByText('Struggling')).toBeInTheDocument();
      expect(screen.getByText('Heavy')).toBeInTheDocument();
      expect(screen.getByText('Okay')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Thriving')).toBeInTheDocument();
    });

    it('has role="dialog" with aria-labelledby on root', () => {
      renderCheckIn();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'checkin-greeting');
    });

    it('mood orbs have radiogroup/radio roles', () => {
      renderCheckIn();
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(5);
    });

    it('does not show textarea or Continue button initially', () => {
      renderCheckIn();
      expect(screen.queryByPlaceholderText(/what's on your heart/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
    });
  });

  describe('Mood Selection', () => {
    it('selecting a mood shows textarea and Continue button', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]); // Okay

      expect(screen.getByPlaceholderText(/what's on your heart/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    it('selected orb has aria-checked true, others false', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[0]); // Struggling

      expect(orbs[0]).toHaveAttribute('aria-checked', 'true');
      expect(orbs[1]).toHaveAttribute('aria-checked', 'false');
      expect(orbs[2]).toHaveAttribute('aria-checked', 'false');
      expect(orbs[3]).toHaveAttribute('aria-checked', 'false');
      expect(orbs[4]).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Text Input', () => {
    it('textarea enforces 280-char limit', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]);

      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      expect(textarea).toHaveAttribute('maxLength', '280');
    });

    it('character counter displays and changes color at thresholds', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]);

      // Type 224 chars → warning (warningAt=224)
      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      fireEvent.change(textarea, { target: { value: 'a'.repeat(224) } });

      const counter = screen.getByText('224 / 280');
      expect(counter).toHaveClass('text-amber-400');

      // Type 269 chars → danger (dangerAt=269)
      fireEvent.change(textarea, { target: { value: 'a'.repeat(269) } });
      const dangerCounter = screen.getByText('269 / 280');
      expect(dangerCounter).toHaveClass('text-red-400');
    });
  });

  describe('Verse Display Flow', () => {
    it('Continue with no text → verse display', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]); // Okay
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Verse text is split across spans by KaraokeTextReveal
      expect(screen.getByText('Be')).toBeInTheDocument();
      expect(screen.getByText('God.')).toBeInTheDocument();
      expect(screen.getByText('Psalm 46:10')).toBeInTheDocument();
    });

    it('Continue with normal text → verse display', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[3]); // Good

      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      fireEvent.change(textarea, { target: { value: 'Feeling blessed today' } });
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Verse text is split across spans by KaraokeTextReveal
      expect(screen.getByText('Give')).toBeInTheDocument();
      expect(screen.getByText('Yahweh,')).toBeInTheDocument();
      expect(screen.getByText('Psalm 107:1')).toBeInTheDocument();
    });

    it('correct verse for each mood level', async () => {
      for (let i = 0; i < MOOD_OPTIONS.length; i++) {
        const { unmount } = renderCheckIn();
        const orbs = screen.getAllByRole('radio');
        await userEvent.click(orbs[i]);
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));

        expect(screen.getByText(MOOD_OPTIONS[i].verseReference)).toBeInTheDocument();
        unmount();
        vi.clearAllMocks();
      }
    });

    it('verse auto-advances after 3 seconds', () => {
      vi.useFakeTimers();
      renderCheckIn();

      const orbs = screen.getAllByRole('radio');
      fireEvent.click(orbs[2]); // Okay
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(mockOnComplete).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          mood: 3,
          moodLabel: 'Okay',
          verseSeen: 'Psalm 46:10',
        })
      );
    });

    it('aria-live="polite" on verse display', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[0]);
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Verse text split across spans — find a word and traverse to aria-live container
      const liveRegion = screen.getByText('Yahweh').closest('[aria-live]');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Crisis Detection', () => {
    it('Continue with crisis text → crisis banner', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[0]); // Struggling

      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      fireEvent.change(textarea, { target: { value: 'I want to kill myself' } });
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/988 Suicide & Crisis Lifeline/)).toBeInTheDocument();
      expect(screen.getByText(/Crisis Text Line/)).toBeInTheDocument();
      expect(screen.getByText(/SAMHSA National Helpline/)).toBeInTheDocument();
    });

    it('crisis banner shows all 3 resources', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[0]);

      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      fireEvent.change(textarea, { target: { value: 'I want to end it all' } });
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('988')).toBeInTheDocument();
      expect(screen.getByText(/Text HOME to 741741/)).toBeInTheDocument();
      expect(screen.getByText('1-800-662-4357')).toBeInTheDocument();
    });

    it('mood entry saved even when crisis banner shown', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[0]);

      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      fireEvent.change(textarea, { target: { value: 'I want to kill myself' } });
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      const stored = JSON.parse(localStorage.getItem('wr_mood_entries') || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].mood).toBe(1);
      expect(stored[0].moodLabel).toBe('Struggling');
    });

    it('crisis banner dismiss calls onComplete', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[0]);

      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      fireEvent.change(textarea, { target: { value: 'I want to kill myself' } });
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      await userEvent.click(screen.getByRole('button', { name: /continue to dashboard/i }));
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('empty text input skips crisis check', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[0]);
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Should show verse, not crisis banner
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      // Verse text split across spans by KaraokeTextReveal
      expect(screen.getByText('broken')).toBeInTheDocument();
    });
  });

  describe('Skip', () => {
    it('skip link calls onSkip', async () => {
      renderCheckIn();
      await userEvent.click(screen.getByText(/not right now/i));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('skip link has 44px min touch target', () => {
      renderCheckIn();
      const skipLink = screen.getByText(/not right now/i);
      expect(skipLink).toHaveClass('min-h-[44px]');
    });
  });

  describe('Data Persistence', () => {
    it('mood entry saved to localStorage on Continue', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[4]); // Thriving

      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      fireEvent.change(textarea, { target: { value: 'Great day!' } });
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      const stored = JSON.parse(localStorage.getItem('wr_mood_entries') || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0]).toEqual(
        expect.objectContaining({
          mood: 5,
          moodLabel: 'Thriving',
          text: 'Great day!',
          verseSeen: 'Psalm 118:24',
        })
      );
    });

    it('entry has correct schema fields', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]);
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      const stored = JSON.parse(localStorage.getItem('wr_mood_entries') || '[]');
      const entry = stored[0];

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('mood');
      expect(entry).toHaveProperty('moodLabel');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('verseSeen');
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.timestamp).toBe('number');
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('entry without text has text undefined', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]);
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      const stored = JSON.parse(localStorage.getItem('wr_mood_entries') || '[]');
      expect(stored[0].text).toBeUndefined();
    });
  });

  describe('Keyboard Navigation', () => {
    it('arrow key navigation through mood orbs', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      orbs[0].focus();

      fireEvent.keyDown(screen.getByRole('radiogroup'), {
        key: 'ArrowRight',
      });
      expect(orbs[1]).toHaveFocus();

      fireEvent.keyDown(screen.getByRole('radiogroup'), {
        key: 'ArrowRight',
      });
      expect(orbs[2]).toHaveFocus();
    });

    it('arrow keys wrap around', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      orbs[0].focus();

      fireEvent.keyDown(screen.getByRole('radiogroup'), {
        key: 'ArrowLeft',
      });
      expect(orbs[4]).toHaveFocus();
    });

    it('Enter selects focused mood orb', () => {
      renderCheckIn();
      const radiogroup = screen.getByRole('radiogroup');

      // Navigate to orb[2] via arrow keys (focusedIndex starts at 0)
      fireEvent.keyDown(radiogroup, { key: 'ArrowRight' });
      fireEvent.keyDown(radiogroup, { key: 'ArrowRight' });
      fireEvent.keyDown(radiogroup, { key: 'Enter' });

      const orbs = screen.getAllByRole('radio');
      expect(orbs[2]).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByPlaceholderText(/what's on your heart/i)).toBeInTheDocument();
    });

    it('Space selects focused mood orb', () => {
      renderCheckIn();
      const radiogroup = screen.getByRole('radiogroup');

      // Navigate to orb[1] via arrow key
      fireEvent.keyDown(radiogroup, { key: 'ArrowRight' });
      fireEvent.keyDown(radiogroup, { key: ' ' });

      const orbs = screen.getAllByRole('radio');
      expect(orbs[1]).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Reduced Motion', () => {
    it('no motion-safe animation classes when prefers-reduced-motion is set', () => {
      const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      renderCheckIn();
      // motion-safe: prefixed classes only apply when motion is NOT reduced.
      // The classes are present in the markup but the browser applies them conditionally.
      // We verify the classes use motion-safe: prefix (not bare animate-).
      const container = screen.getByRole('dialog');
      const html = container.innerHTML;
      // All animate- classes should be prefixed with motion-safe:
      expect(html).not.toMatch(/(?<!motion-safe:)animate-mood-pulse/);
      expect(html).not.toMatch(/(?<!motion-safe:)animate-fade-in/);

      matchMediaSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('long user name does not overflow', () => {
      const longName = 'A'.repeat(100);
      renderCheckIn(longName);
      const greeting = screen.getByText(new RegExp(`How are you feeling today, ${longName}`));
      expect(greeting).toBeInTheDocument();
    });
  });

  describe('KaraokeTextReveal Integration', () => {
    it('verse text renders via KaraokeTextReveal', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]); // Okay
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Each word of the verse should be present in the DOM
      const verseWords = MOOD_OPTIONS[2].verse.split(/\s+/);
      for (const word of verseWords) {
        expect(screen.getByText(word)).toBeInTheDocument();
      }
    });

    it('verse reference hidden until reveal completes', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      renderCheckIn();

      const orbs = screen.getAllByRole('radio');
      fireEvent.click(orbs[2]); // Okay
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Reference should start hidden (opacity-0 is on the parent <p>)
      const reference = screen.getByText('Psalm 46:10');
      const referenceParagraph = reference.closest('p');
      expect(referenceParagraph).toHaveClass('opacity-0');

      // After full reveal (2500ms + 200ms buffer)
      act(() => {
        vi.advanceTimersByTime(2701);
      });

      expect(referenceParagraph).toHaveClass('opacity-100');
    });

    it('reduced motion shows verse and reference immediately', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(useReducedMotion).mockReturnValue(true);

      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      fireEvent.click(orbs[2]); // Okay
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // All verse words visible immediately
      const verseWords = MOOD_OPTIONS[2].verse.split(/\s+/);
      for (const word of verseWords) {
        expect(screen.getByText(word).style.opacity).toBe('1');
      }

      // onRevealComplete fires on next tick → reference visible
      act(() => {
        vi.advanceTimersByTime(1);
      });
      const reference = screen.getByText('Psalm 46:10');
      const referenceParagraph = reference.closest('p');
      expect(referenceParagraph).toHaveClass('opacity-100');
    });
  });

  describe('Verse linking', () => {
    it('mood check-in verse reference is a link', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      renderCheckIn();

      // Select "Okay" mood and continue to verse phase
      fireEvent.click(screen.getAllByRole('radio')[2]);
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Advance past karaoke reveal (2500ms + buffer)
      act(() => {
        vi.advanceTimersByTime(2701);
      });

      const link = screen.getByRole('link', { name: 'Psalm 46:10' });
      expect(link).toHaveAttribute('href', '/bible/psalms/46#verse-10');
    });

    it('mood check-in link preserves fade animation', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      renderCheckIn();

      fireEvent.click(screen.getAllByRole('radio')[2]);
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // The parent p should have transition-opacity for the fade
      const referenceParagraph = screen.getByText('Psalm 46:10').closest('p');
      expect(referenceParagraph?.className).toContain('transition-opacity');
    });
  });

  describe('Accessibility', () => {
    it('textarea has aria-label', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]);
      expect(screen.getByLabelText("Share what's on your heart")).toBeInTheDocument();
    });

    it('character count renders with CharacterCount component', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]);
      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      expect(screen.getByText('5 / 280')).toBeInTheDocument();
    });

    it('warning color appears at 224 chars', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]);
      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      fireEvent.change(textarea, { target: { value: 'a'.repeat(224) } });
      expect(screen.getByText('224 / 280')).toHaveClass('text-amber-400');
    });
  });
});
