'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dedupLocalStorage } from '@/lib/dedup-storage'
import type { Song, Playlist } from '@/types/music'

interface LibraryState {
  likedSongs: Record<string, Song>
  history: Song[]
  playlists: Record<string, Playlist>
  toggleLike: (song: Song) => void
  isLiked: (id: string) => boolean
  addToHistory: (song: Song) => void
  createPlaylist: (name: string) => string
  addToPlaylist: (playlistId: string, song: Song) => void
  removeFromPlaylist: (playlistId: string, songId: string) => void
  deletePlaylist: (playlistId: string) => void
  updatePlaylistName: (playlistId: string, name: string) => void
  updatePlaylistSongs: (playlistId: string, songs: Song[]) => void
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      likedSongs: {},
      history: [],
      playlists: {},

      toggleLike: (song) =>
        set((s) => {
          const liked = { ...s.likedSongs }
          if (liked[song.id]) delete liked[song.id]
          else liked[song.id] = song
          return { likedSongs: liked }
        }),

      isLiked: (id) => Boolean(get().likedSongs[id]),

      addToHistory: (song) =>
        set((s) => {
          if (s.history[0]?.id === song.id) return s
          const filtered = s.history.filter((h) => h.id !== song.id)
          return { history: [song, ...filtered].slice(0, 200) }
        }),

      createPlaylist: (name) => {
        const id = `playlist-${Date.now()}`
        set((s) => ({
          playlists: {
            ...s.playlists,
            [id]: { id, name, songs: [], createdAt: Date.now() },
          },
        }))
        return id
      },

      addToPlaylist: (playlistId, song) =>
        set((s) => {
          const pl = s.playlists[playlistId]
          if (!pl) return s
          const already = pl.songs.some((s) => s.id === song.id)
          if (already) return s
          return {
            playlists: {
              ...s.playlists,
              [playlistId]: { ...pl, songs: [...pl.songs, song] },
            },
          }
        }),

      removeFromPlaylist: (playlistId, songId) =>
        set((s) => {
          const pl = s.playlists[playlistId]
          if (!pl) return s
          return {
            playlists: {
              ...s.playlists,
              [playlistId]: { ...pl, songs: pl.songs.filter((s) => s.id !== songId) },
            },
          }
        }),

      deletePlaylist: (playlistId) =>
        set((s) => {
          const pls = { ...s.playlists }
          delete pls[playlistId]
          return { playlists: pls }
        }),

      updatePlaylistName: (playlistId, name) =>
        set((s) => {
          const pl = s.playlists[playlistId]
          if (!pl) return s
          return {
            playlists: {
              ...s.playlists,
              [playlistId]: { ...pl, name },
            },
          }
        }),

      updatePlaylistSongs: (playlistId, songs) =>
        set((s) => {
          const pl = s.playlists[playlistId]
          if (!pl) return s
          return {
            playlists: {
              ...s.playlists,
              [playlistId]: { ...pl, songs },
            },
          }
        }),
    }),
    { name: 'ytm-library', storage: createJSONStorage(() => dedupLocalStorage), skipHydration: true }
  )
)
