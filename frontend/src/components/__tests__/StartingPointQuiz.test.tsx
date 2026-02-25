import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'
import { QUIZ_QUESTIONS } from '@/components/quiz-data'

function renderQuiz() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <StartingPointQuiz />
    </MemoryRouter>
  )
}

/** Select an answer and wait for auto-advance to the next question */
const user = userEvent.setup()

async function selectAndAdvance(optionText: string, nextQuestionNum: number) {
  await user.click(
    screen.getByRole('button', { name: new RegExp(optionText, 'i') })
  )
  if (nextQuestionNum <= QUIZ_QUESTIONS.length) {
    await waitFor(() => {
      expect(
        screen.getByText(`Question ${nextQuestionNum} of 5`)
      ).toBeInTheDocument()
    })
  } else {
    // Result card
    await waitFor(() => {
      expect(
        screen.getByText(/we'd recommend starting with/i)
      ).toBeInTheDocument()
    })
  }
}

/** Answer all 5 questions with the first option to reach the result card */
async function answerAllQuestions() {
  for (let i = 0; i < QUIZ_QUESTIONS.length; i++) {
    const nextQ = i + 2 // Question numbers are 1-indexed; after Q1 we expect Q2, etc.
    await selectAndAdvance(QUIZ_QUESTIONS[i].options[0].label, nextQ)
  }
}

describe('StartingPointQuiz', () => {
  describe('Structure & Semantics', () => {
    it('renders as a named section landmark', () => {
      renderQuiz()
      expect(
        screen.getByRole('region', { name: /not sure where to start/i })
      ).toBeInTheDocument()
    })

    it('renders the heading with "Start" text', () => {
      renderQuiz()
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: /not sure where to start/i,
        })
      ).toBeInTheDocument()
    })

    it('renders the subheading', () => {
      renderQuiz()
      expect(
        screen.getByText(/take a 30-second quiz/i)
      ).toBeInTheDocument()
    })

    it('has id="quiz" on the section', () => {
      renderQuiz()
      expect(document.getElementById('quiz')).toBeInTheDocument()
    })

    it('renders progress bar with correct ARIA attributes', () => {
      renderQuiz()
      const progressbar = screen.getByRole('progressbar', {
        name: /quiz progress/i,
      })
      expect(progressbar).toHaveAttribute('aria-valuenow', '20')
      expect(progressbar).toHaveAttribute('aria-valuemin', '0')
      expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    })

    it('shows "Question 1 of 5" initially', () => {
      renderQuiz()
      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    })
  })

  describe('Question Display', () => {
    it('displays first question text', () => {
      renderQuiz()
      expect(
        screen.getByText(QUIZ_QUESTIONS[0].question)
      ).toBeInTheDocument()
    })

    it('displays 4 answer options as buttons', () => {
      renderQuiz()
      for (const option of QUIZ_QUESTIONS[0].options) {
        expect(
          screen.getByRole('button', {
            name: new RegExp(option.label, 'i'),
          })
        ).toBeInTheDocument()
      }
    })

    it('back button is hidden on first question', () => {
      renderQuiz()
      expect(
        screen.queryByRole('button', { name: /back/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('User Interaction', () => {
    it('selecting an answer shows selected state', async () => {
      renderQuiz()

      const firstOption = screen.getByRole('button', {
        name: new RegExp(QUIZ_QUESTIONS[0].options[0].label, 'i'),
      })

      await user.click(firstOption)

      // Check immediately after click, before auto-advance timer fires
      expect(firstOption).toHaveAttribute('aria-pressed', 'true')
    })

    it('selecting an answer auto-advances to next question after delay', async () => {
      renderQuiz()

      await selectAndAdvance(QUIZ_QUESTIONS[0].options[0].label, 2)

      expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
      expect(
        screen.getByText(QUIZ_QUESTIONS[1].question)
      ).toBeInTheDocument()
    })

    it('progress bar updates on advance', async () => {
      renderQuiz()

      await selectAndAdvance(QUIZ_QUESTIONS[0].options[0].label, 2)

      const progressbar = screen.getByRole('progressbar', {
        name: /quiz progress/i,
      })
      expect(progressbar).toHaveAttribute('aria-valuenow', '40')
    })

    it('back button appears on question 2', async () => {
      renderQuiz()

      await selectAndAdvance(QUIZ_QUESTIONS[0].options[0].label, 2)

      expect(
        screen.getByRole('button', { name: /back/i })
      ).toBeInTheDocument()
    })

    it('clicking back returns to previous question', async () => {
      renderQuiz()

      await selectAndAdvance(QUIZ_QUESTIONS[0].options[0].label, 2)

      await user.click(screen.getByRole('button', { name: /back/i }))

      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
      expect(
        screen.getByText(QUIZ_QUESTIONS[0].question)
      ).toBeInTheDocument()
    })

    it('going back preserves previous answer selection', async () => {
      renderQuiz()

      // Select first option on Q1
      await selectAndAdvance(QUIZ_QUESTIONS[0].options[0].label, 2)

      // Go back
      await user.click(screen.getByRole('button', { name: /back/i }))

      // Check the first option is still marked as selected
      const firstOption = screen.getByRole('button', {
        name: new RegExp(QUIZ_QUESTIONS[0].options[0].label, 'i'),
      })
      expect(firstOption).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Result Card', () => {
    it('shows result card after completing all 5 questions', async () => {
      renderQuiz()

      await answerAllQuestions()

      expect(
        screen.getByText(/we'd recommend starting with/i)
      ).toBeInTheDocument()
    })

    it('result card shows correct destination for all-first-option answers', async () => {
      renderQuiz()

      await answerAllQuestions()

      // All first options → pray wins (8 points)
      expect(
        screen.getByText(/we'd recommend starting with prayer/i)
      ).toBeInTheDocument()
    })

    it('result card shows description text', async () => {
      renderQuiz()

      await answerAllQuestions()

      expect(
        screen.getByText(/it sounds like you could use a moment with god/i)
      ).toBeInTheDocument()
    })

    it('result card shows scripture verse', async () => {
      renderQuiz()

      await answerAllQuestions()

      expect(
        screen.getByText(/cast all your anxiety on him/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/1 peter 5:7/i)).toBeInTheDocument()
    })

    it('result card CTA links to correct route', async () => {
      renderQuiz()

      await answerAllQuestions()

      const ctaLink = screen.getByRole('link', { name: /go to prayer/i })
      expect(ctaLink).toHaveAttribute('href', '/scripture')
    })

    it('result card "explore all features" scrolls to journey', async () => {
      renderQuiz()

      await answerAllQuestions()

      const scrollIntoViewMock = vi.fn()
      const mockElement = { scrollIntoView: scrollIntoViewMock }
      vi.spyOn(document, 'getElementById').mockReturnValue(
        mockElement as unknown as HTMLElement
      )

      await user.click(
        screen.getByRole('button', { name: /explore all features/i })
      )

      expect(document.getElementById).toHaveBeenCalledWith('journey-heading')
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })

      vi.restoreAllMocks()
    })

    it('retake quiz resets to question 1', async () => {
      renderQuiz()

      await answerAllQuestions()

      await user.click(
        screen.getByRole('button', { name: /retake quiz/i })
      )

      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
      expect(
        screen.getByText(QUIZ_QUESTIONS[0].question)
      ).toBeInTheDocument()
      const progressbar = screen.getByRole('progressbar', {
        name: /quiz progress/i,
      })
      expect(progressbar).toHaveAttribute('aria-valuenow', '20')
    })

    it('progress bar and question counter hidden on result card', async () => {
      renderQuiz()

      await answerAllQuestions()

      expect(
        screen.queryByRole('progressbar', { name: /quiz progress/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(/question \d of 5/i)
      ).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('answer buttons are keyboard accessible', () => {
      renderQuiz()
      const buttons = QUIZ_QUESTIONS[0].options.map((opt) =>
        screen.getByRole('button', {
          name: new RegExp(opt.label, 'i'),
        })
      )
      for (const button of buttons) {
        expect(button.tagName).toBe('BUTTON')
      }
    })

    it('progress bar has accessible label', () => {
      renderQuiz()
      const progressbar = screen.getByRole('progressbar', {
        name: /quiz progress/i,
      })
      expect(progressbar).toBeInTheDocument()
    })
  })
})
