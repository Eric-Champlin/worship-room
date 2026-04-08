export function VerseNoteMarker() {
  return (
    <span
      className="note-marker ml-0.5 inline-block align-super transition-colors duration-150"
      style={{ fontSize: '0.7em' }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="inline-block"
        style={{
          width: '0.85em',
          height: '0.85em',
          color: 'var(--note-marker)',
          verticalAlign: 'baseline',
        }}
      >
        <path d="M12 20h9" />
        <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838.838-2.872a2 2 0 0 1 .506-.855z" />
      </svg>
    </span>
  )
}
