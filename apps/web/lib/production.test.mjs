import test from 'node:test'
import assert from 'node:assert/strict'
import robots from '../app/robots.ts'
import sitemap from '../app/sitemap.ts'
import { logger } from './logger.ts'

test('robots() generates valid crawler rules and disallows /api/', () => {
  const config = robots()
  assert.ok(config, 'Robots configuration should exist')
  assert.ok(Array.isArray(config.rules) || typeof config.rules === 'object')

  const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules
  assert.equal(rule.userAgent, '*')
  assert.ok(rule.disallow.includes('/api/'))
  assert.ok(config.sitemap.includes('/sitemap.xml'))
})

test('sitemap() outputs canonical application routes with priorities', () => {
  const routes = sitemap()
  assert.ok(Array.isArray(routes))
  assert.ok(routes.length >= 5)

  const urls = routes.map((r) => r.url)
  assert.ok(urls.some((u) => u.endsWith('/')), 'Root route should be present')
  assert.ok(urls.some((u) => u.endsWith('/explore')), 'Explore route should be present')
  assert.ok(urls.some((u) => u.endsWith('/search')), 'Search route should be present')
  assert.ok(urls.some((u) => u.endsWith('/library')), 'Library route should be present')
  assert.ok(urls.some((u) => u.endsWith('/settings')), 'Settings route should be present')
})

test('logger correctly formats log lines without throwing', () => {
  assert.doesNotThrow(() => {
    logger.info('Test info message', { module: 'test' })
    logger.warn('Test warn message')
    logger.error('Test error message', new Error('sample test error'))
  })
})
