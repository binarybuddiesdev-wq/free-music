export interface Song {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  image: string
  downloadUrl: string
  language: string
  year?: string
}

export interface Playlist {
  id: string
  name: string
  songs: Song[]
  createdAt: number
}

export interface Album {
  id: string
  title: string
  artist: string
  year?: string
  image: string
  songCount: number
  language?: string
}

export interface Artist {
  id: string
  name: string
  image: string
  role?: string
  subscriberCount?: number
  genres?: string[]
}

export interface SearchPlaylist {
  id: string
  title: string
  owner: string
  image: string
  songCount: number
  language?: string
}

export interface LyricLine {
  time: number
  text: string
}

export interface Language {
  value: string
  label: string
  english: string
}
