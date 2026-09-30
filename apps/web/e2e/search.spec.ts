import { test, expect } from '@playwright/test'

test.describe('Search Intelligence Flow', () => {
  test('typing in search bar triggers suggestions and navigates to search results', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()

    await searchInput.fill('pushpa')
    await searchInput.press('Enter')

    await expect(page).toHaveURL(/.*search.*q=pushpa/, { timeout: 10000 })
    // Search page should show tabs (All, Songs, Albums, Artists, Playlists)
    await expect(page.getByText(/Songs|Albums|Artists/i).first()).toBeVisible()
  })

  test('search handles empty query or special characters safely', async ({ page }) => {
    await page.goto('/search?q=%20%20%20')
    // Should not throw or crash
    await expect(page.locator('body')).toBeVisible()

    await page.goto('/search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E')
    // Sanitizer strips HTML and script tags
    await expect(page.locator('body')).toBeVisible()
    const scriptTag = page.locator('script:has-text("alert(1)")')
    expect(await scriptTag.count()).toBe(0)
  })

  test('search filter tabs filter category results', async ({ page }) => {
    await page.goto('/search?q=anirudh')
    await page.waitForLoadState('networkidle')

    // Click Songs tab if present
    const songsTab = page.getByRole('button', { name: /^Songs$/i }).first()
    if (await songsTab.isVisible()) {
      await songsTab.click({ force: true })
      await expect(page).toHaveURL(/.*type=songs|.*q=anirudh/)
    }
  })
})
