/**
 * Random page per key, chosen once per page load. Reloading the tab picks new
 * pages (fresh songs); navigating inside the app reuses them so React Query can
 * serve cached sections instead of refetching everything.
 *
 * Pure module: no imports (unit-tested with node --test).
 */
const pages = new Map<string, number>()

export function sessionPage(key: string, maxPage = 8, random: () => number = Math.random): number {
  let page = pages.get(key)
  if (page === undefined) {
    page = Math.floor(random() * maxPage) + 1
    pages.set(key, page)
  }
  return page
}
