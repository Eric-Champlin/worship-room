export function VerseBookmarkMarker() {
  return (
    <span
      className="bookmark-marker mr-0.5 inline-block align-super transition-colors duration-fast"
      style={{ fontSize: '0.7em' }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="inline-block"
        style={{
          width: '0.85em',
          height: '0.85em',
          color: 'var(--bookmark-marker)',
          verticalAlign: 'baseline',
        }}
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </span>
  )
}
