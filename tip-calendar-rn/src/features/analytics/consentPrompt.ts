export function shouldShowAnalyticsPrompt(
  startedOnboarding: boolean,
  finishedOnboarding: boolean,
  onCalendarTabs: boolean,
  consent: boolean | null,
): boolean {
  return startedOnboarding && finishedOnboarding && onCalendarTabs && consent === null
}
