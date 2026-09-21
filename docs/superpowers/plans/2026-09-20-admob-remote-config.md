# AdMob Remote-Controlled Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add privacy-gated adaptive AdMob banners to Calendar and Stats, controlled by Firebase Remote Config `showAd`, without generating Build 5.

**Architecture:** Three isolated modules own remote enablement, UMP consent, and banner rendering. A provider performs one startup refresh and exposes a final eligibility state; target screens render one shared `AdBannerSlot`, while every failure falls back to no advertisement.

**Tech Stack:** Expo SDK 57, React Native 0.86, Expo Router, React Native Firebase Remote Config, React Native Google Mobile Ads, Jest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-20-admob-remote-config-design.md`

## Global Constraints

- iOS Bundle ID remains `app.tipcalendar`.
- Production AdMob App ID is `ca-app-pub-3534156575856999~3337306828`.
- Production Banner ID is `ca-app-pub-3534156575856999/7356442883`.
- Remote Config key is exactly `showAd`, with an in-app default of `false`.
- Only Calendar and Stats may render ads.
- No IDFA request, ATT prompt, shift data, income data, restaurant data, dates, or notes may enter advertising APIs.
- Development and preview builds use Google's test Banner ID; only production uses the real unit ID.
- Do not run EAS Build or create Build 5; the user will build manually after development.

## Review Focus

- A malformed or unavailable Remote Config value must remain `false`, covered by Task 2 tests.
- UMP errors or incomplete consent must prevent an ad request, covered by Task 3 tests.
- Expo Go and Jest must not crash while native ad modules are unavailable, covered by Tasks 2 and 3 tests.
- A banner load failure must remove its layout space and leave page interactions intact, covered by Task 4 tests.
- Production/test ad IDs must never be selected in the wrong environment, covered by Task 1 tests.

---

### Task 1: Native Dependencies and Release Configuration

**Files:**
- Modify: `tip-calendar-rn/package.json`
- Modify: `tip-calendar-rn/package-lock.json`
- Modify: `tip-calendar-rn/app.json`
- Modify: `tip-calendar-rn/firebase.json`
- Modify: `tip-calendar-rn/src/release/appConfig.test.ts`

**Interfaces:**
- Consumes: existing Expo config and static-framework setup.
- Produces: installed `react-native-google-mobile-ads` and `@react-native-firebase/remote-config`, disabled Firebase auto collection, and valid AdMob native configuration.

- [ ] **Step 1: Extend the release configuration test**

Add assertions that `app.json` contains the Google Mobile Ads plugin with the production App ID, that build number is left unchanged by development work, and that `firebase.json` defaults Analytics and Crashlytics auto collection to `false`.

```ts
expect(serialized).toContain("react-native-google-mobile-ads")
expect(serialized).toContain("ca-app-pub-3534156575856999~3337306828")
expect(firebase["react-native"].analytics_auto_collection_enabled).toBe(false)
expect(firebase["react-native"].crashlytics_auto_collection_enabled).toBe(false)
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --runInBand src/release/appConfig.test.ts`
Expected: FAIL because the dependencies/plugin and safe Firebase defaults are absent.

- [ ] **Step 3: Install native dependencies**

Run:

```bash
npx expo install react-native-google-mobile-ads @react-native-firebase/remote-config
```

- [ ] **Step 4: Configure Expo and Firebase defaults**

Add the Google Mobile Ads plugin to `app.json`:

```json
[
  "react-native-google-mobile-ads",
  {
    "iosAppId": "ca-app-pub-3534156575856999~3337306828",
    "delayAppMeasurementInit": true
  }
]
```

Do not add a meaningful ATT usage description or call ATT. Change `firebase.json` auto collection defaults to `false`; retain disabled Ad ID and ad-personalization signals.

- [ ] **Step 5: Verify GREEN and config resolution**

Run:

```bash
npm test -- --runInBand src/release/appConfig.test.ts
npx expo config --type public
```

Expected: PASS and resolved config includes the AdMob plugin/App ID.

- [ ] **Step 6: Commit**

```bash
git add tip-calendar-rn/package.json tip-calendar-rn/package-lock.json tip-calendar-rn/app.json tip-calendar-rn/firebase.json tip-calendar-rn/src/release/appConfig.test.ts
git commit -m "feat: configure AdMob and Remote Config"
```

### Task 2: Remote Config Advertising Gate

**Files:**
- Create: `tip-calendar-rn/src/features/ads/adConfig.ts`
- Create: `tip-calendar-rn/src/features/ads/adConfig.test.ts`
- Modify: `tip-calendar-rn/src/test/setup.ts`

**Interfaces:**
- Produces: `loadShowAd(): Promise<boolean>`.
- Behavior: defaults to false, performs one fetch/activate per process, parses only a Firebase Boolean, and catches native/module/network errors.

- [ ] **Step 1: Write failing tests**

Cover false default, true remote result, malformed/failed fetch fallback, and one-fetch memoization:

```ts
expect(await loadShowAd()).toBe(false)
expect(await loadShowAd()).toBe(true)
await Promise.all([loadShowAd(), loadShowAd()])
expect(fetchAndActivate).toHaveBeenCalledTimes(1)
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/features/ads/adConfig.test.ts`
Expected: FAIL because `adConfig.ts` does not exist.

- [ ] **Step 3: Implement the adapter**

Expose one function and keep Firebase imports inside the guarded function:

```ts
export async function loadShowAd(): Promise<boolean> {
  try {
    const remoteConfig = require("@react-native-firebase/remote-config").default()
    await remoteConfig.setDefaults({ showAd: false })
    await remoteConfig.setConfigSettings({ minimumFetchIntervalMillis: __DEV__ ? 0 : 43_200_000 })
    await remoteConfig.fetchAndActivate()
    return remoteConfig.getValue("showAd").asBoolean() === true
  } catch {
    return false
  }
}
```

Wrap the promise at module scope so repeated screen renders do not refetch. Export a test-only reset following the existing analytics reporter reset pattern.

- [ ] **Step 4: Add the Jest native-module mock**

Mock Remote Config in `src/test/setup.ts` with `setDefaults`, `setConfigSettings`, `fetchAndActivate`, and `getValue().asBoolean()`.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --runInBand src/features/ads/adConfig.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tip-calendar-rn/src/features/ads/adConfig.ts tip-calendar-rn/src/features/ads/adConfig.test.ts tip-calendar-rn/src/test/setup.ts
git commit -m "feat: add Remote Config ad gate"
```

### Task 3: UMP Consent Adapter and Ad Availability Provider

**Files:**
- Create: `tip-calendar-rn/src/features/ads/adConsent.ts`
- Create: `tip-calendar-rn/src/features/ads/adConsent.test.ts`
- Create: `tip-calendar-rn/src/features/ads/AdProvider.tsx`
- Create: `tip-calendar-rn/src/features/ads/adEligibility.ts`
- Create: `tip-calendar-rn/src/features/ads/adEligibility.test.ts`
- Modify: `tip-calendar-rn/src/app/_layout.tsx`
- Modify: `tip-calendar-rn/src/test/setup.ts`

**Interfaces:**
- Consumes: `loadShowAd(): Promise<boolean>` from Task 2.
- Produces: `requestAdConsent(): Promise<{ canRequestAds: boolean; privacyOptionsRequired: boolean }>`; `showAdPrivacyOptions(): Promise<void>`; `isAdEligible(showAd, canRequestAds): boolean`; `useAds(): AdContextValue`.

- [ ] **Step 1: Write eligibility and consent failure tests**

```ts
expect(isAdEligible(true, true)).toBe(true)
expect(isAdEligible(false, true)).toBe(false)
expect(isAdEligible(true, false)).toBe(false)
await expect(requestAdConsent()).resolves.toEqual({
  canRequestAds: false,
  privacyOptionsRequired: false,
})
```

The error test must make the SDK throw and prove the fallback denies requests.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/features/ads/adEligibility.test.ts src/features/ads/adConsent.test.ts`
Expected: FAIL because the modules are absent.

- [ ] **Step 3: Implement UMP adapter**

Use the package's consent API through this stable project-owned shape:

```ts
export type AdConsentState = {
  canRequestAds: boolean
  privacyOptionsRequired: boolean
}

export async function requestAdConsent(): Promise<AdConsentState>
export async function showAdPrivacyOptions(): Promise<void>
```

Call the installed package's consent-info update and required-form method. Map its privacy-options requirement enum to a boolean. Catch every error and return denied state; never synthesize consent.

- [ ] **Step 4: Implement provider startup flow**

`AdProvider` runs one effect:

```ts
const [state, setState] = useState({
  ready: false,
  showAd: false,
  canRequestAds: false,
  privacyOptionsRequired: false,
})

const [showAd, consent] = await Promise.all([loadShowAd(), requestAdConsent()])
setState({ ready: true, showAd, ...consent })
```

Expose `eligible`, `privacyOptionsRequired`, and `openPrivacyOptions`. Wrap `RootStack` inside `AdProvider` in `_layout.tsx`.

- [ ] **Step 5: Mock Google Mobile Ads in Jest and verify GREEN**

Add a manual Jest mock that never reaches the network. Run:

```bash
npm test -- --runInBand src/features/ads/adEligibility.test.ts src/features/ads/adConsent.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tip-calendar-rn/src/features/ads tip-calendar-rn/src/app/_layout.tsx tip-calendar-rn/src/test/setup.ts
git commit -m "feat: gate ads behind UMP consent"
```

### Task 4: Adaptive Banner Component

**Files:**
- Create: `tip-calendar-rn/src/features/ads/adUnit.ts`
- Create: `tip-calendar-rn/src/features/ads/adUnit.test.ts`
- Create: `tip-calendar-rn/src/features/ads/AdBannerSlot.tsx`
- Create: `tip-calendar-rn/src/features/ads/AdBannerSlot.test.tsx`

**Interfaces:**
- Consumes: `useAds().eligible` from Task 3.
- Produces: `getBannerAdUnitId(environment): string`; `<AdBannerSlot testID?: string />`.

- [ ] **Step 1: Write environment-selection tests**

```ts
expect(getBannerAdUnitId("development")).toBe(TestIds.ADAPTIVE_BANNER)
expect(getBannerAdUnitId("preview")).toBe(TestIds.ADAPTIVE_BANNER)
expect(getBannerAdUnitId("production")).toBe("ca-app-pub-3534156575856999/7356442883")
```

- [ ] **Step 2: Write component behavior tests**

Prove the slot is absent when ineligible, appears only after load, and disappears after failure. Mock `BannerAd` as a deterministic test component that invokes `onAdLoaded` or `onAdFailedToLoad`.

- [ ] **Step 3: Verify RED**

Run: `npm test -- --runInBand src/features/ads/adUnit.test.ts src/features/ads/AdBannerSlot.test.tsx`
Expected: FAIL because the modules are absent.

- [ ] **Step 4: Implement the unit selector and slot**

Use `BannerAdSize.ANCHORED_ADAPTIVE_BANNER`. Keep a `loaded` state and render the outer height only after `onAdLoaded`; reset/hide on failure. Pass only non-personalized-safe request options required by the installed SDK and do not attach app data as targeting keywords.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --runInBand src/features/ads/adUnit.test.ts src/features/ads/AdBannerSlot.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tip-calendar-rn/src/features/ads/adUnit.ts tip-calendar-rn/src/features/ads/adUnit.test.ts tip-calendar-rn/src/features/ads/AdBannerSlot.tsx tip-calendar-rn/src/features/ads/AdBannerSlot.test.tsx
git commit -m "feat: add adaptive AdMob banner slot"
```

### Task 5: Calendar and Stats Integration

**Files:**
- Modify: `tip-calendar-rn/src/app/(tabs)/index.tsx`
- Modify: `tip-calendar-rn/src/app/(tabs)/stats.tsx`
- Create: `tip-calendar-rn/src/features/ads/adPlacement.ts`
- Create: `tip-calendar-rn/src/features/ads/adPlacement.test.ts`

**Interfaces:**
- Consumes: `<AdBannerSlot />` from Task 4.
- Produces: ads on Calendar/Stats only; `shouldShowBannerOnRoute(route): boolean` as a regression guard.

- [ ] **Step 1: Write route-placement tests**

```ts
expect(shouldShowBannerOnRoute("index")).toBe(true)
expect(shouldShowBannerOnRoute("stats")).toBe(true)
expect(shouldShowBannerOnRoute("me")).toBe(false)
expect(shouldShowBannerOnRoute("shift/new")).toBe(false)
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/features/ads/adPlacement.test.ts`
Expected: FAIL because the helper is absent.

- [ ] **Step 3: Integrate the banner below page content**

Calendar and Stats should use a full-height parent with their existing content as `flex-1`, followed by `<AdBannerSlot />`. Do not add the component to the tabs layout or Me screen, which would unintentionally display it everywhere.

- [ ] **Step 4: Verify layout and GREEN**

Run:

```bash
npm test -- --runInBand src/features/ads/adPlacement.test.ts src/features/calendar/CalendarMonth.test.ts src/features/stats/statsSummary.test.ts
```

Expected: PASS; no existing Calendar/Stats behavior changes.

- [ ] **Step 5: Commit**

```bash
git add 'tip-calendar-rn/src/app/(tabs)/index.tsx' 'tip-calendar-rn/src/app/(tabs)/stats.tsx' tip-calendar-rn/src/features/ads/adPlacement.ts tip-calendar-rn/src/features/ads/adPlacement.test.ts
git commit -m "feat: show banners on calendar and stats"
```

### Task 6: Privacy Choices and Public Disclosures

**Files:**
- Modify: `tip-calendar-rn/src/app/preferences.tsx`
- Modify: `tip-calendar-rn/src/app/about-privacy.tsx`
- Modify: `tip-calendar-html/privacy.html`
- Modify: `tip-calendar-html/app-ads.txt`
- Modify: `tip-calendar-html/robots.txt`

**Interfaces:**
- Consumes: `useAds().privacyOptionsRequired` and `openPrivacyOptions()` from Task 3.
- Produces: conditional `Ad privacy choices` settings row, accurate policy copy, and root `app-ads.txt`.

- [ ] **Step 1: Add a failing disclosure test**

Extend `src/release/appConfig.test.ts` or create `src/release/adDisclosure.test.ts` to read the checked-in website files and assert:

```ts
expect(appAds).toContain("google.com, pub-3534156575856999, DIRECT, f08c47fec0942fa0")
expect(privacy).toMatch(/AdMob|advertis/i)
expect(privacy).toMatch(/withdraw|privacy choices/i)
```

- [ ] **Step 2: Verify RED**

Run the focused disclosure test. Expected: FAIL because `app-ads.txt` and AdMob policy text are absent.

- [ ] **Step 3: Add in-app privacy controls**

Show a `SettingsRow` titled `Ad privacy choices` only when `privacyOptionsRequired` is true. Its press handler calls `openPrivacyOptions`; errors remain non-blocking and may show a simple retry alert.

- [ ] **Step 4: Update policies and app-ads.txt**

Describe AdMob/UMP, data categories, advertising purpose, Remote Config gating, consent withdrawal, and the fact that financial entries are not sent. Create exactly:

```text
google.com, pub-3534156575856999, DIRECT, f08c47fec0942fa0
```

- [ ] **Step 5: Verify GREEN**

Run the focused disclosure test and `git diff --check`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tip-calendar-rn/src/app/preferences.tsx tip-calendar-rn/src/app/about-privacy.tsx tip-calendar-html/privacy.html tip-calendar-html/app-ads.txt tip-calendar-html/robots.txt tip-calendar-rn/src/release
git commit -m "docs: disclose AdMob and add privacy controls"
```

### Task 7: Full Verification Without Building

**Files:**
- Modify only files needed to fix failures introduced by Tasks 1-6.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a source tree ready for the user's manual Build 5.

- [ ] **Step 1: Run all static and unit checks**

```bash
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npx expo config --type public
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Verify release safeguards**

Search the project and confirm:

```bash
rg -n "3534156575856999/7356442883|TestIds\.ADAPTIVE_BANNER|showAd|requestTrackingAuthorization|NSUserTrackingUsageDescription" src app.json
```

Expected: production unit ID exists only in `adUnit.ts`/tests; no ATT call; `showAd` default is false; no meaningful ATT usage description.

- [ ] **Step 3: Verify no unintended build**

Confirm no EAS build command was executed as part of this plan and report the final local `expo.ios.buildNumber` without changing it solely for a build.

- [ ] **Step 4: Final review and handoff**

Report:

- checks executed and results;
- Firebase/AdMob console steps still requiring the user;
- website deployment still requiring confirmation;
- exact manual EAS command for the user, but do not run it:

```bash
npx eas-cli build --platform ios --profile production
```
