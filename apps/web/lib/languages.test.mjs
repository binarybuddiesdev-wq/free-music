import test from 'node:test'
import assert from 'node:assert/strict'
import { LANGUAGES, DEFAULT_LANGUAGE } from './languages.ts'
import { sanitizeLanguage, ALLOWED_LANGUAGES } from './security.ts'

test('every language offered in the UI is accepted by the API allowlist', () => {
  for (const lang of LANGUAGES) {
    assert.equal(sanitizeLanguage(lang.value), lang.value, `${lang.value} must not fall back to telugu`)
  }
})

test('allowlist has no languages the UI cannot select', () => {
  const selectable = new Set(LANGUAGES.map((l) => l.value))
  for (const lang of ALLOWED_LANGUAGES) {
    assert.ok(selectable.has(lang), `${lang} is allowed but not selectable`)
  }
})

test('default language is allowed', () => {
  assert.equal(sanitizeLanguage(DEFAULT_LANGUAGE), DEFAULT_LANGUAGE)
})
