'use client'
import { useLibraryStore } from '@/stores/library.store'
import { usePlayerStore } from '@/stores/player.store'

export function LikeButton({ size = 20 }: { size?: number }) {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const toggleLike = useLibraryStore((s) => s.toggleLike)
  const isLiked = useLibraryStore((s) => s.isLiked)
  const liked = currentSong ? isLiked(currentSong.id) : false

  if (!currentSong) return null

  return (
    <button
      onClick={() => toggleLike(currentSong)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: liked ? 'var(--accent)' : 'var(--text-secondary)',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        transition: 'color 0.15s, transform 0.1s',
      }}
      className="hover:text-[var(--text-primary)]"
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <svg
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        style={{ width: size, height: size }}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  )
}
