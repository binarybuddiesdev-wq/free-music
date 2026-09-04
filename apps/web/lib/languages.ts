import type { Language } from '@/types/music'

export const LANGUAGES: Language[] = [
  { value: 'telugu',    label: 'తెలుగు',    english: 'Telugu' },
  { value: 'hindi',     label: 'हिन्दी',     english: 'Hindi' },
  { value: 'tamil',     label: 'தமிழ்',     english: 'Tamil' },
  { value: 'kannada',   label: 'ಕನ್ನಡ',     english: 'Kannada' },
  { value: 'malayalam', label: 'മലയാളം',    english: 'Malayalam' },
  { value: 'punjabi',   label: 'ਪੰਜਾਬੀ',    english: 'Punjabi' },
  { value: 'marathi',   label: 'मराठी',     english: 'Marathi' },
  { value: 'bengali',   label: 'বাংলা',     english: 'Bengali' },
  { value: 'gujarati',  label: 'ગુજરાતી',   english: 'Gujarati' },
  { value: 'odia',      label: 'ଓଡ଼ିଆ',     english: 'Odia' },
  { value: 'assamese',  label: 'অসমীয়া',   english: 'Assamese' },
  { value: 'urdu',      label: 'اردو',      english: 'Urdu' },
  { value: 'bhojpuri',  label: 'भोजपुरी',   english: 'Bhojpuri' },
  { value: 'english',   label: 'English',   english: 'English' },
]

export const DEFAULT_LANGUAGE = 'telugu'
