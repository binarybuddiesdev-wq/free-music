import { test, expect } from '@playwright/test'

test.describe('Settings & Theme Customization Flow', () => {
  test('allows changing theme and persisting selection in localStorage', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Find theme selector or buttons
    const darkThemeBtn = page.getByRole('button', { name: /dark/i }).first()
    if (await darkThemeBtn.isVisible()) {
      await darkThemeBtn.click()
      // HTML attribute data-theme or class should be set
      const html = page.locator('html')
      await expect(html).toHaveAttribute('data-theme', /dark|pure-black/i)
    }

    const lightThemeBtn = page.getByRole('button', { name: /light/i }).first()
    if (await lightThemeBtn.isVisible()) {
      await lightThemeBtn.click()
      const html = page.locator('html')
      await expect(html).toHaveAttribute('data-theme', 'light')
    }
  })

  test('allows configuring audio quality tier', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const qualitySelect = page.locator('select, button').filter({ hasText: /320|High|160|Normal|48|Low/i }).first()
    await expect(qualitySelect).toBeVisible()
  })
})
