export function SkeletonCard() {
  return (
    <div style={{ width: 160, flexShrink: 0 }}>
      <div
        style={{
          width: 160,
          height: 240,
          borderRadius: 6,
          background: 'var(--bg-elevated)',
          marginBottom: 8,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div style={{ height: 13, background: 'var(--bg-elevated)', borderRadius: 3, marginBottom: 6, width: '80%', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 12, background: 'var(--bg-elevated)', borderRadius: 3, width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
