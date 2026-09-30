export function SkeletonCard() {
  return (
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', padding: 8, width: 160 }}>
      <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 8, background: 'var(--panel-bg)', animation: 'pulse-skel 1.4s infinite' }} />
      <div style={{ height: 14, borderRadius: 4, background: 'var(--panel-bg)', animation: 'pulse-skel 1.4s infinite', marginTop: 8 }} />
      <div style={{ height: 12, borderRadius: 4, background: 'var(--panel-bg)', animation: 'pulse-skel 1.4s infinite', marginTop: 6, width: '60%' }} />
    </div>
  )
}
