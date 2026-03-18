/**
 * Generates a URL-safe username from an email prefix with a random suffix.
 * The suffix makes collisions extremely unlikely without a uniqueness DB check.
 * Example: "john.doe" → "john_doe_a3f2"
 */
export function buildUsername(emailPrefix: string): string {
  const base = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 20)
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}_${suffix}`
}
