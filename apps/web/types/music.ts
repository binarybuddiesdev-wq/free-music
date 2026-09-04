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

export interface LyricLine {
  time: number
  text: string
}

export interface SearchResult {
  songs: Song[]
  total: number
}

export interface Language {
  value: string
  label: string
  english: string
}
