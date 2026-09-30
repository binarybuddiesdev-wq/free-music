import { test, expect } from '@playwright/test'

test.describe('PWA & Offline Resilience Flow', () => {
  test('serves valid web app manifest with required PWA icons', async ({ request }) => {
    const res = await request.get('/manifest.json')
    expect(res.ok()).toBeTruthy()
    const manifest = await res.json()
    expect(manifest.name).toBeTruthy()
    expect(manifest.icons).toBeInstanceOf(Array)
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
  })

  test('serves offline.html fallback page', async ({ request }) => {
    const res = await request.get('/offline.html')
    expect(res.ok()).toBeTruthy()
    const html = await res.text()
    expect(html).toContain('offline')
  })

  test('health check probe returns status healthy and timestamp', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.uptime).toBeGreaterThanOrEqual(0)
  })

  test('robots.txt disallows sensitive API paths', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.ok()).toBeTruthy()
    const txt = await res.text()
    expect(txt).toContain('Disallow: /api/')
  })
})
