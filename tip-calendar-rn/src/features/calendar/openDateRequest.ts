let pendingLocalDate: string | null = null

export function requestOpenDate(localDate: string) {
  pendingLocalDate = localDate
}

export function takeOpenDateRequest(): string | null {
  const next = pendingLocalDate
  pendingLocalDate = null
  return next
}
