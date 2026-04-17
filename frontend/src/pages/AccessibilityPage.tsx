import { Layout } from '@/components/Layout'
import { SEO } from '@/components/SEO'

export function AccessibilityPage() {
  return (
    <Layout>
      <SEO
        title="Accessibility | Worship Room"
        description="Worship Room's commitment to accessibility. We aim to meet WCAG 2.2 Level AA across the entire application."
      />
      <div className="mx-auto max-w-3xl py-12 sm:py-16">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Our Commitment to Accessibility
        </h1>

        <p className="mt-6 text-white/80 leading-relaxed">
          Worship Room is built to be accessible to everyone who wants to use it, including
          users with disabilities or assistive technology. We believe that devotional practice
          should be available to all people, and we are committed to making that a reality.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Accessibility Standard
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA across
          the entire application.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          What We Have Done
        </h2>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>
            <strong className="text-white">Keyboard navigation:</strong> Every feature can be accessed and used with a keyboard alone
          </li>
          <li>
            <strong className="text-white">Screen reader support:</strong> Pages use semantic HTML, ARIA labels, and live regions to
            work with screen readers like VoiceOver, NVDA, and JAWS
          </li>
          <li>
            <strong className="text-white">Focus management:</strong> Modals, drawers, and dialogs trap focus appropriately and return
            focus when closed
          </li>
          <li>
            <strong className="text-white">Color contrast:</strong> All text meets WCAG AA contrast requirements against our dark theme
            backgrounds
          </li>
          <li>
            <strong className="text-white">Touch targets:</strong> Interactive elements meet the minimum 44x44 pixel target size
          </li>
          <li>
            <strong className="text-white">Reduced motion:</strong> Animations respect the prefers-reduced-motion system setting
          </li>
          <li>
            <strong className="text-white">Skip navigation:</strong> A skip-to-content link lets keyboard users bypass the navigation
            menu
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Known Limitations
        </h2>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>
            Third-party Spotify embeds may not fully meet accessibility standards
          </li>
          <li>
            Audio content (ambient sounds, guided prayers) does not currently have text
            transcripts — this is planned for a future update
          </li>
          <li>
            Some complex interactive surfaces (verse highlighting, memorization card flipping)
            have basic keyboard support but may not provide the optimal screen reader experience
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Feedback
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          If you encounter an accessibility barrier while using Worship Room, we want to hear
          about it. Please reach out at{' '}
          <a
            href="mailto:accessibility@worshiproom.com"
            className="text-primary-lt underline hover:text-primary transition-colors"
          >
            accessibility@worshiproom.com
          </a>{' '}
          and we will work to address the issue promptly.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Last Audit
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          April 2026
        </p>
      </div>
    </Layout>
  )
}
