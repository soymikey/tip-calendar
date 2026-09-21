const BANNER_ROUTES = new Set(["index", "stats"])

export function shouldShowBannerOnRoute(route: string): boolean {
  return BANNER_ROUTES.has(route)
}
