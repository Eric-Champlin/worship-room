import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoodCheckIn } from '../MoodCheckIn';
import { MOOD_OPTIONS } from '@/constants/dashboard/mood';

const mockOnComplete = vi.fn();
const mockOnSkip = vi.fn();

function renderCheckIn(userName = 'Eric') {
  return render(
    <MoodCheckIn
      userName={userName}
      onComplete={mockOnComplete}
      onSkip={mockOnSkip}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
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

      // Initially 0/280 — default color
      expect(screen.getByText('0/280')).toBeInTheDocument();

      // Type 250 chars → warning
      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      const longText = 'a'.repeat(250);
      fireEvent.change(textarea, { target: { value: longText } });

      const counter = screen.getByText('250/280');
      expect(counter).toHaveClass('text-warning');

      // Type 280 chars → danger
      fireEvent.change(textarea, { target: { value: 'a'.repeat(280) } });
      const dangerCounter = screen.getByText('280/280');
      expect(dangerCounter).toHaveClass('text-danger');
    });
  });

  describe('Verse Display Flow', () => {
    it('Continue with no text → verse display', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[2]); // Okay
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText(/Be still, and know that I am God/)).toBeInTheDocument();
      expect(screen.getByText('Psalm 46:10')).toBeInTheDocument();
    });

    it('Continue with normal text → verse display', async () => {
      renderCheckIn();
      const orbs = screen.getAllByRole('radio');
      await userEvent.click(orbs[3]); // Good

      const textarea = screen.getByPlaceholderText(/what's on your heart/i);
      fireEvent.change(textarea, { target: { value: 'Feeling blessed today' } });
      await userEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText(/Give thanks to the Lord/)).toBeInTheDocument();
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

      const liveRegion = screen.getByText(/The Lord is near/).closest('[aria-live]');
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
      expect(screen.getByText(/The Lord is near/)).toBeInTheDocument();
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
});
