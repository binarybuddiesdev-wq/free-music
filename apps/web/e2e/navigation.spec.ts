import { test, expect } from '@playwright/test'

test.describe('Navigation & Shell Flow', () => {
  test('loads homepage with shell, navigation, and greeting', async ({ page }) => {
    await page.goto('/')

    // Expect page title or main layout
    await expect(page).toHaveTitle(/YouTube Music|Free Music/i)

    // Verify search input is present
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()

    // Verify sidebar navigation links
    const homeLink = page.getByRole('link', { name: /Home/i })
    await expect(homeLink).toBeVisible()

    const exploreLink = page.getByRole('link', { name: /Explore/i })
    await expect(exploreLink).toBeVisible()

    const libraryLink = page.getByRole('link', { name: /Library/i })
    await expect(libraryLink).toBeVisible()
  })

  test('navigates to Explore page', async ({ page }) => {
    await page.goto('/explore')
    await expect(page).toHaveURL(/.*explore/)
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()
  })

  test('navigates to Library page and shows empty or saved tabs', async ({ page }) => {
    await page.goto('/library')
    await expect(page).toHaveURL(/.*library/)
    // Library should render tabs for Liked, Playlists, Downloads
    await expect(page.getByText(/Liked|Playlists|Downloads/i).first()).toBeVisible()
  })

  test('navigates to Settings page', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/.*settings/)
    await expect(page.getByText(/Audio Quality|Theme|Language/i).first()).toBeVisible()
  })

  test('handles 404 not found route gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-random-route-404')
    expect(response?.status()).toBe(404)
    await expect(page.getByText(/404|not found|page doesn't exist/i).first()).toBeVisible()
  })
})
