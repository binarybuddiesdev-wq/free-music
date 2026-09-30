// Returns a random page (1–8) — called once per component mount so every
// page reload gets a fresh random number, which busts the server-side cache.
export function randomPage(): number {
  return Math.floor(Math.random() * 8) + 1
}
