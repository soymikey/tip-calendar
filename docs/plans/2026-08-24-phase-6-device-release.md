# Phase 6: Device Release Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]` ) syntax for tracking.

**Goal:** Make the iOS app a store-candidate in the repo: correct identity, no extra permissions, privacy manifests that match local-only storage, VoiceOver labels on dates/amounts/tabs, and an EAS preview profile.

**Architecture:** Release config lives in `tip-calendar-rn/app.json` and `eas.json`. Accessibility helpers are pure functions with tests. This phase does not add features, ads, accounts, or Android store work. A real-iPhone walkthrough still needs a human; the repo will contain the checklist and the config that walkthrough depends on.

**Tech Stack:** Existing Expo SDK 57 app, `eas.json`, iOS privacy manifests.

---

## File map

Create:

- `tip-calendar-rn/eas.json`
- `tip-calendar-rn/src/features/calendar/calendarA11y.ts`
- `tip-calendar-rn/src/features/calendar/calendarA11y.test.ts`
- `tip-calendar-rn/src/release/appConfig.test.ts`

Modify:

- `tip-calendar-rn/app.json`
- `tip-calendar-rn/src/features/calendar/CalendarMonth.tsx`
- `tip-calendar-rn/src/app/(tabs)/index.tsx`
- `tip-calendar-rn/src/features/stats/StatsScreen.tsx`
- `tip-calendar-rn/src/components/PrimaryButton.tsx`
- `tip-calendar-rn/src/components/SegmentedControl.tsx`
- `docs/plans/README.md`

---

### Task 1: App identity and privacy

- [x] Display name **Tip Calendar**
- [x] `bundleIdentifier`: `app.tipcalendar`
- [x] Light UI only, no iPad
- [x] `ITSAppUsesNonExemptEncryption: false`
- [x] `NSPrivacyTracking: false`, empty collected data types
- [x] Declare UserDefaults + file timestamp reasons used by AsyncStorage / file export
- [x] No camera, location, tracking, or notification usage strings

### Task 2: Accessibility

- [x] Calendar days announce date + amount. Tabs already labeled. Primary buttons and segmented options announce their visible label. Tap targets stay ≥ 44pt.

### Task 3: EAS + doctor

- [x] `eas.json` with `development`, `preview`, `production` iOS profiles. Run `npx expo-doctor`. Do not submit a store build from this session.

### Task 4: Device checklist

- [x] Human checklist in this plan. No ads / IAP / upgrade prompts in the codebase.

---

## Device QA (human, iPhone)

1. Fresh install → Onboarding → Calendar
2. Record a shift → green amount on that day
3. Second tap opens Day Details; edit + delete + undo
4. Stats week/month totals match Calendar; tap a day opens form or details
5. Me → Preferences week start rotates calendar headers
6. Export CSV and JSON via the share sheet
7. Import JSON asks before replacing data
8. VoiceOver: Calendar / Stats / Me tabs, a day with an amount, Save
9. Larger Text: Calendar and form still usable one-handed
10. Confirm no ads, paywalls, or unrelated permission prompts
