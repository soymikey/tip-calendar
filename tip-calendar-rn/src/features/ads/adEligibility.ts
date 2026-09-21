export function isAdEligible(showAd: boolean, canRequestAds: boolean): boolean {
  return showAd && canRequestAds
}
