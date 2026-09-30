'use client'
import { createContext } from 'react'

export const SeenSongsContext = createContext<React.MutableRefObject<Set<string>> | null>(null)
