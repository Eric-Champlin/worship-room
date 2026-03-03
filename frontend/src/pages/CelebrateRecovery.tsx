import { LocalSupportPage } from '@/components/local-support/LocalSupportPage'

export function CelebrateRecovery() {
  return (
    <LocalSupportPage
      config={{
        category: 'celebrate-recovery',
        headingId: 'celebrate-recovery-heading',
        title: 'Find Celebrate Recovery',
        subtitle:
          "Freedom from hurts, habits, and hang-ups starts with showing up. Celebrate Recovery is a Christ-centered 12-step recovery program where you'll find people who understand — because they've been there too.",
        extraHeroContent: (
          <div className="mx-auto mt-4 max-w-2xl rounded-xl bg-white/10 px-6 py-4 text-left text-sm text-white/80 backdrop-blur-sm">
            <p className="font-semibold text-white">What is Celebrate Recovery?</p>
            <p className="mt-1">
              Celebrate Recovery is a Christ-centered, 12-step recovery program for anyone
              struggling with hurts, habits, and hang-ups. Based on the Beatitudes, it meets
              weekly at local churches across the country and offers a safe space for healing
              through small groups, worship, and community support.
            </p>
          </div>
        ),
        searchKeyword: 'Celebrate Recovery',
        filterOptions: null,
        filterLabel: null,
      }}
    />
  )
}
