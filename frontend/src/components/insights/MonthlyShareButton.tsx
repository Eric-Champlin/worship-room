import { useToast } from '@/components/ui/Toast'

export function MonthlyShareButton() {
  const { showToast } = useToast()

  return (
    <div className="text-center">
      <button
        onClick={() =>
          showToast(
            'Sharing your report is coming soon.',
            'success',
          )
        }
        aria-label="Share your monthly report"
        className="w-full rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
      >
        Share Your Month
      </button>
    </div>
  )
}
