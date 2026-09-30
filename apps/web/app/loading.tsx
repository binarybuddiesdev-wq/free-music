import { SkeletonCard } from '@/components/home/SkeletonCard'

export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36, padding: '16px 0' }}>
      {/* Skeleton Header Chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'hidden' }}>
        {[80, 100, 72, 90, 84, 110].map((width, i) => (
          <div
            key={i}
            style={{
              width,
              height: 32,
              borderRadius: 8,
              background: 'var(--panel-bg)',
              animation: 'pulse-skel 1.4s infinite',
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Row 1 Skeletons */}
      <div>
        <div
          style={{
            height: 24,
            width: 180,
            borderRadius: 6,
            background: 'var(--panel-bg)',
            animation: 'pulse-skel 1.4s infinite',
            marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 12, overflowX: 'hidden' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>

      {/* Row 2 Skeletons */}
      <div>
        <div
          style={{
            height: 24,
            width: 220,
            borderRadius: 6,
            background: 'var(--panel-bg)',
            animation: 'pulse-skel 1.4s infinite',
            marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 12, overflowX: 'hidden' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
