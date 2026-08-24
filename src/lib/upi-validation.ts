const upiIdPattern =
  /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,98}@[a-zA-Z][a-zA-Z0-9._-]{1,48}$/

export function isPlausibleUpiId(value: string | null | undefined) {
  if (!value) return false
  const trimmed = value.trim()
  return trimmed.length <= 120 && upiIdPattern.test(trimmed)
}
