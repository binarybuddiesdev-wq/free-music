'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { onEnterSpace } from '@/lib/utils'
import type { Artist } from '@/types/music'

interface ArtistCardProps {
  artist: Artist
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)

  const handleClick = () => {
    router.push(`/artist/${encodeURIComponent(artist.id || artist.name)}`)
  }

  const formatFollowers = (count?: number) => {
    if (!count) return null
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M subscribers`
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K subscribers`
    return `${count} subscribers`
  }

  const sub = [artist.role || 'Artist', formatFollowers(artist.subscriberCount)].filter(Boolean).join(' • ')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => onEnterSpace(e, handleClick)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 170,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        padding: 8,
        borderRadius: 8,
        transition: 'background .15s ease',
        background: hovered ? 'var(--panel-bg)' : 'transparent',
      }}
      title={`Explore artist: ${artist.name}`}
    >
      {/* Circular Avatar */}
      <div
        style={{
          position: 'relative',
          width: 150,
          height: 150,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--bg-elevated)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
        }}
      >
        {artist.image ? (
          <Image
            src={artist.image}
            alt={artist.name}
            fill
            sizes="150px"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ marginTop: 12, width: '100%' }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {artist.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: 3,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  )
}
