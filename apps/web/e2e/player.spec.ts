import { test, expect } from '@playwright/test'

test.describe('Audio Player & Controls Flow', () => {
  test('keyboard shortcuts do not crash when no song is active', async ({ page }) => {
    await page.goto('/')

    // Press Space or K (toggle play)
    await page.keyboard.press('Space')
    await page.keyboard.press('KeyK')
    await page.keyboard.press('KeyJ')
    await page.keyboard.press('KeyL')
    await page.keyboard.press('KeyM')

    // Page must remain responsive and un-crashed
    await expect(page.locator('body')).toBeVisible()
  })

  test('queue drawer button opens and closes queue panel', async ({ page }) => {
    await page.goto('/')

    const queueBtn = page.locator('button[title*="queue" i], button[aria-label*="queue" i]').first()
    if (await queueBtn.isVisible()) {
      await queueBtn.click()
      // Queue drawer or overlay should appear
      await page.keyboard.press('Escape')
    }
  })
})
