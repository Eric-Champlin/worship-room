import { Link } from 'react-router-dom'

const FOOTER_DAILY_LINKS = [
  { label: 'Pray', to: '/scripture' },
  { label: 'Journal', to: '/journal' },
  { label: 'Meditate', to: '/meditate' },
  { label: 'Verse & Song', to: '/daily' },
]

const FOOTER_MUSIC_LINKS = [
  { label: 'Worship Playlists', to: '/music/playlists' },
  { label: 'Ambient Sounds', to: '/music/ambient' },
  { label: 'Sleep & Rest', to: '/music/sleep' },
]

const FOOTER_SUPPORT_LINKS = [
  { label: 'Prayer Wall', to: '/prayer-wall' },
  { label: 'Churches', to: '/churches' },
  { label: 'Counselors', to: '/counselors' },
]

const FOOTER_COLUMNS = [
  { heading: 'Daily', links: FOOTER_DAILY_LINKS },
  { heading: 'Music', links: FOOTER_MUSIC_LINKS },
  { heading: 'Support', links: FOOTER_SUPPORT_LINKS },
]

function AppStoreBadge() {
  return (
    <span className="inline-flex h-[40px] cursor-default items-center gap-2 rounded-md border border-white/20 bg-black px-3 opacity-60">
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-white"
        aria-hidden="true"
      >
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-[9px] font-normal text-white/90">Download on the</span>
        <span className="mt-0.5 text-[17px] font-medium leading-tight text-white">App Store</span>
      </div>
    </span>
  )
}

function GooglePlayBadge() {
  return (
    <span className="inline-flex h-[40px] cursor-default items-center gap-2 rounded-md border border-white/20 bg-black px-3 opacity-60">
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M3.61 1.814L13.793 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .61-.92z" fill="#4285F4" />
        <path d="M4.113 1.465L14.5 7.5l-2.707 2.707L4.113 1.465z" fill="#EA4335" />
        <path d="M15.5 8.5l3.5 2a1 1 0 0 1 0 1.73l-3.5 2.02-3-3.025L15.5 8.5z" fill="#FBBC04" />
        <path d="M4.113 22.535l7.68-8.742L14.5 16.5l-10.387 6.035z" fill="#34A853" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-[9px] font-normal uppercase tracking-wider text-white/90">Get it on</span>
        <span className="mt-0.5 text-[17px] font-medium leading-tight text-white">Google Play</span>
      </div>
    </span>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-hero-dark">
      {/* Gradient transition from quiz white to footer dark purple */}
      <div
        className="h-32 sm:h-40"
        style={{
          background: 'linear-gradient(to bottom, #FFFFFF 0%, #0D0620 100%)',
        }}
      />

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {/* Logo */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
            aria-label="Worship Room home"
          >
            <span className="font-script text-5xl font-bold text-white">
              Worship Room
            </span>
          </Link>
        </div>

        {/* Nav Columns */}
        <nav aria-label="Footer navigation" className="mt-10">
          <div className="mx-auto grid max-w-lg grid-cols-1 gap-8 text-center sm:max-w-2xl sm:grid-cols-3">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                  {column.heading}
                </h3>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="relative inline-block pb-0.5 text-sm text-muted-gray transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark rounded after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-center after:scale-x-0 after:bg-white after:transition-transform after:duration-300 hover:after:scale-x-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Divider */}
        <hr className="my-8 border-dark-border" />

        {/* App Download Row */}
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-medium text-white">
            Take Worship Room With You
          </p>
          <div className="flex gap-3">
            <AppStoreBadge />
            <GooglePlayBadge />
          </div>
        </div>

        {/* Divider */}
        <hr className="my-8 border-dark-border" />

        {/* Crisis Resources */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-muted-gray">
          <span>If you&apos;re in crisis:</span>
          <span>
            988 Suicide &amp; Crisis Lifeline:{' '}
            <a
              href="tel:988"
              className="rounded underline transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
            >
              988
            </a>
          </span>
          <span>Crisis Text Line: Text HOME to 741741</span>
          <span>
            SAMHSA Helpline:{' '}
            <a
              href="tel:1-800-662-4357"
              className="rounded underline transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
            >
              1-800-662-4357
            </a>
          </span>
        </div>

        {/* Disclaimer */}
        <p className="mx-auto mt-4 max-w-2xl text-center text-[11px] text-subtle-gray">
          Worship Room provides spiritual encouragement and support. It is not a
          substitute for professional medical, psychological, or psychiatric
          care. If you are in crisis, please call 988 (Suicide &amp; Crisis
          Lifeline) or contact a licensed mental health professional.
        </p>

        {/* Copyright */}
        <p className="mt-4 text-center text-xs text-subtle-gray">
          &copy; {new Date().getFullYear()} Worship Room. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
