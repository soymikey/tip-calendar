# Firebase Analytics + Crashlytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Report anonymous usage (installs, shift saves) and crashes through Firebase, without uploading shift income, restaurant names, or dates.

**Architecture:** UI save paths call `track()` after a successful write. `track` uses an injectable reporter: no-op in Jest and Expo Go, native Analytics in EAS builds. Crashlytics collection is enabled at app start behind the same try/catch. Do not import Firebase from domain or `localStore`.

**Tech Stack:** Expo SDK 57, `@react-native-firebase/app` + `analytics` + `crashlytics`, `expo-build-properties`, Jest from `tip-calendar-rn/`. iOS bundle id `app.tipcalendar`. Plist already at `tip-calendar-rn/GoogleService-Info.plist`. Do not change H5 `src/`.

**Spec:** `docs/superpowers/specs/2026-08-27-firebase-analytics-crashlytics-design.md`

**Worktree:** Master has unrelated uncommitted work. Implement on `feat/firebase-analytics-crashlytics` in `.worktrees/firebase-analytics-crashlytics` (see superpowers `using-git-worktrees`). Copy `tip-calendar-rn/GoogleService-Info.plist` into the worktree if it is not committed yet.

---

## File map

Create:

- `tip-calendar-rn/src/features/analytics/track.ts` — reporter injection, `track`, event names
- `tip-calendar-rn/src/features/analytics/track.test.ts`
- `tip-calendar-rn/src/features/analytics/firebaseNative.ts` — Expo Go-safe native reporter + Crashlytics init
- `tip-calendar-rn/firebase.json` — disable advertising ID / ad personalization
- `tip-calendar-rn/GoogleService-Info.plist` — already on disk; add to git in Task 5

Modify:

- `tip-calendar-rn/src/features/onboarding/OnboardingFlow.tsx` — `onboarding_completed`
- `tip-calendar-rn/src/app/shift/new.tsx` — `shift_saved` `is_edit: false`
- `tip-calendar-rn/src/app/shift/[id].tsx` — `shift_saved` `is_edit: true`
- `tip-calendar-rn/src/app/data-backup.tsx` — export / import / delete events
- `tip-calendar-rn/src/app/about-privacy.tsx` — anonymous analytics section
- `tip-calendar-rn/src/app/_layout.tsx` — init Crashlytics
- `tip-calendar-rn/app.json` — googleServicesFile, plugins, privacy collected types, Android `AD_ID` block
- `tip-calendar-rn/src/release/appConfig.test.ts`
- `tip-calendar-rn/src/test/setup.ts` — mock RN Firebase modules
- `tip-calendar-rn/package.json` / lockfile via `npx expo install`

Do not modify: `createShift`, `createRestaurant`, `localStore`, H5 `src/`, ATT / `NSUserTrackingUsageDescription`.

After each task, run tests from `tip-calendar-rn/` (`npm test -- <file>` then `npm test`). Commits from repo root.

---

### Task 1: Injectable `track()` that never throws

**Files:**

- Create: `tip-calendar-rn/src/features/analytics/track.ts`
- Create: `tip-calendar-rn/src/features/analytics/track.test.ts`

- [ ] **Step 1: Write failing tests for events, params, and error swallowing**

Create `tip-calendar-rn/src/features/analytics/track.test.ts`:

```ts
import {
  AnalyticsEvent,
  onboardingCompletedParams,
  resetAnalyticsReporter,
  setAnalyticsReporter,
  shiftSavedParams,
  track,
} from "./track"

describe("analytics params", () => {
  it("only sends booleans and kind enums", () => {
    expect(shiftSavedParams(false)).toEqual({ is_edit: false })
    expect(shiftSavedParams(true)).toEqual({ is_edit: true })
    expect(onboardingCompletedParams(true)).toEqual({ skipped: true })
    const serialized = JSON.stringify({
      ...shiftSavedParams(true),
      ...onboardingCompletedParams(false),
      kind: "json",
    })
    expect(serialized).not.toMatch(/cents|restaurantName|localDate|note/i)
  })
})

describe("track", () => {
  afterEach(() => {
    resetAnalyticsReporter()
  })

  it("forwards the event name and params to the reporter", async () => {
    const reporter = jest.fn().mockResolvedValue(undefined)
    setAnalyticsReporter(reporter)
    await track(AnalyticsEvent.shiftSaved, shiftSavedParams(false))
    expect(reporter).toHaveBeenCalledWith("shift_saved", { is_edit: false })
  })

  it("swallows reporter errors", async () => {
    setAnalyticsReporter(async () => {
      throw new Error("offline")
    })
    await expect(track(AnalyticsEvent.dataDeleted)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails because the module is missing**

Run: `cd tip-calendar-rn && npm test -- src/features/analytics/track.test.ts`

Expected: FAIL `Cannot find module './track'`

- [ ] **Step 3: Implement `track.ts`**

Create `tip-calendar-rn/src/features/analytics/track.ts`:

```ts
export const AnalyticsEvent = {
  shiftSaved: "shift_saved",
  onboardingCompleted: "onboarding_completed",
  backupExported: "backup_exported",
  backupImported: "backup_imported",
  dataDeleted: "data_deleted",
} as const

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent]

export type AnalyticsParams = {
  is_edit?: boolean
  skipped?: boolean
  kind?: "csv" | "json"
}

export type AnalyticsReporter = (
  name: AnalyticsEventName,
  params?: AnalyticsParams,
) => Promise<void>

const noopReporter: AnalyticsReporter = async () => undefined

let reporter: AnalyticsReporter = noopReporter

export function setAnalyticsReporter(next: AnalyticsReporter): void {
  reporter = next
}

export function resetAnalyticsReporter(): void {
  reporter = noopReporter
}

export function shiftSavedParams(isEdit: boolean): AnalyticsParams {
  return { is_edit: isEdit }
}

export function onboardingCompletedParams(skipped: boolean): AnalyticsParams {
  return { skipped }
}

export async function track(name: AnalyticsEventName, params?: AnalyticsParams): Promise<void> {
  try {
    await reporter(name, params)
  } catch {
    if (__DEV__) {
      console.warn(`Analytics skipped for ${name}`)
    }
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `cd tip-calendar-rn && npm test -- src/features/analytics/track.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/features/analytics/track.ts tip-calendar-rn/src/features/analytics/track.test.ts
git commit -m "$(cat <<'EOF'
feat: add injectable analytics track helper

EOF
)"
```

---

### Task 2: Fire events after successful onboarding, shift save, and backup

**Files:**

- Modify: `tip-calendar-rn/src/features/onboarding/OnboardingFlow.tsx`
- Modify: `tip-calendar-rn/src/app/shift/new.tsx`
- Modify: `tip-calendar-rn/src/app/shift/[id].tsx`
- Modify: `tip-calendar-rn/src/app/data-backup.tsx`
- Modify: `tip-calendar-rn/src/features/analytics/track.test.ts`

- [ ] **Step 1: Extend tests to lock the call sites' event names**

Append to `tip-calendar-rn/src/features/analytics/track.test.ts`:

```ts
describe("AnalyticsEvent names", () => {
  it("matches the spec event strings", () => {
    expect(AnalyticsEvent.shiftSaved).toBe("shift_saved")
    expect(AnalyticsEvent.onboardingCompleted).toBe("onboarding_completed")
    expect(AnalyticsEvent.backupExported).toBe("backup_exported")
    expect(AnalyticsEvent.backupImported).toBe("backup_imported")
    expect(AnalyticsEvent.dataDeleted).toBe("data_deleted")
  })
})
```

These names are what the screens will pass. Run: `cd tip-calendar-rn && npm test -- src/features/analytics/track.test.ts`

Expected: PASS (names already exist). If you renamed events in Task 1, this fails until names match the spec.

- [ ] **Step 2: Call `track` after onboarding save**

In `tip-calendar-rn/src/features/onboarding/OnboardingFlow.tsx`, add import:

```ts
import { AnalyticsEvent, onboardingCompletedParams, track } from "@/features/analytics/track"
```

Change `saveRestaurant` to take `skipped` and report only after `updateState` resolves:

```ts
  async function saveRestaurant(next: OnboardingDraft, skipped: boolean) {
    if (saving) {
      return
    }
    setSaving(true)
    try {
      const restaurant = completeOnboarding(next, new Date().toISOString())
      await updateState((current) => ({
        ...current,
        restaurants: [restaurant],
        preferences: { ...current.preferences, defaultRestaurantId: restaurant.id },
      }))
      await track(AnalyticsEvent.onboardingCompleted, onboardingCompletedParams(skipped))
    } finally {
      setSaving(false)
    }
  }
```

Update callers:

```ts
    await saveRestaurant(draft, false)
```

inside `onPrimary` (Get Started), and:

```ts
    await saveRestaurant(next, true)
```

inside `onSkip`.

- [ ] **Step 3: Call `track` after new and edited shifts persist**

In `tip-calendar-rn/src/app/shift/new.tsx`, add:

```ts
import { AnalyticsEvent, shiftSavedParams, track } from "@/features/analytics/track"
```

After `await updateState(...)` and before `router.back()`:

```ts
          await track(AnalyticsEvent.shiftSaved, shiftSavedParams(false))
```

In `tip-calendar-rn/src/app/shift/[id].tsx`, add the same import. After `await updateState(...)` and before `router.back()`:

```ts
          await track(AnalyticsEvent.shiftSaved, shiftSavedParams(true))
```

- [ ] **Step 4: Call `track` after backup export, import, and delete**

In `tip-calendar-rn/src/app/data-backup.tsx`, add:

```ts
import { AnalyticsEvent, track } from "@/features/analytics/track"
```

After a successful CSV export (after `shareTextFile` for csv, still inside try, before return):

```ts
        await track(AnalyticsEvent.backupExported, { kind: "csv" })
```

After a successful JSON export:

```ts
      await track(AnalyticsEvent.backupExported, { kind: "json" })
```

Keep those after `shareTextFile` succeeds so a cancelled share does not fire the event.

For import, change the Replace Data handler so it waits for save then tracks:

```ts
            onPress: () => {
              void updateState(() => next).then(() =>
                track(AnalyticsEvent.backupImported),
              )
            },
```

In `confirmDeleteAll`, after `await updateState(() => clearedAppState())` and before `router.replace`:

```ts
      await track(AnalyticsEvent.dataDeleted)
```

- [ ] **Step 5: Run the full suite**

Run: `cd tip-calendar-rn && npm test`

Expected: all suites PASS (onboarding/shift/backup tests that exist still pass; `track` swallows errors so save paths cannot fail on analytics).

- [ ] **Step 6: Commit**

```bash
git add tip-calendar-rn/src/features/analytics/track.test.ts \
  tip-calendar-rn/src/features/onboarding/OnboardingFlow.tsx \
  tip-calendar-rn/src/app/shift/new.tsx \
  tip-calendar-rn/src/app/shift/\[id\].tsx \
  tip-calendar-rn/src/app/data-backup.tsx
git commit -m "$(cat <<'EOF'
feat: report anonymous usage after save and backup actions

EOF
)"
```

---

### Task 3: Privacy copy and App Store privacy manifest

**Files:**

- Modify: `tip-calendar-rn/src/app/about-privacy.tsx`
- Modify: `tip-calendar-rn/app.json`
- Modify: `tip-calendar-rn/src/release/appConfig.test.ts`

- [ ] **Step 1: Rewrite the privacy-manifest test so empty collected types fail**

Replace the second test in `tip-calendar-rn/src/release/appConfig.test.ts` with:

```ts
  it("declares anonymous usage and crash data without tracking", () => {
    expect(app.expo.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false)
    expect(app.expo.ios?.privacyManifests?.NSPrivacyTracking).toBe(false)
    expect(app.expo.ios?.privacyManifests?.NSPrivacyCollectedDataTypes).toEqual([
      {
        NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeProductInteraction",
        NSPrivacyCollectedDataTypeLinked: false,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAnalytics"],
      },
      {
        NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCrashData",
        NSPrivacyCollectedDataTypeLinked: false,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
      },
    ])
    expect(serialized).not.toMatch(
      /NSUserTrackingUsageDescription|NSCameraUsageDescription|NSLocationWhenInUseUsageDescription|NSMicrophoneUsageDescription/,
    )
  })
```

- [ ] **Step 2: Run the test and confirm it fails on the empty array**

Run: `cd tip-calendar-rn && npm test -- src/release/appConfig.test.ts`

Expected: FAIL, received `[]`

- [ ] **Step 3: Update `app.json` collected data types**

In `tip-calendar-rn/app.json`, replace `"NSPrivacyCollectedDataTypes": []` with the same two objects as the test. Keep `NSPrivacyTracking` false. Under `android`, add:

```json
      "blockedPermissions": ["com.google.android.gms.permission.AD_ID"]
```

next to the existing `predictiveBackGestureEnabled` field.

- [ ] **Step 4: Add the About & privacy section**

In `tip-calendar-rn/src/app/about-privacy.tsx`, insert this object into `PRIVACY_SECTIONS` after `"No cloud upload in this version"`:

```ts
  {
    title: "Anonymous usage and crash reports",
    body: "This version sends anonymous usage counts (for example app opens and shift saves) and crash reports to an analytics service. It does not upload shift amounts, restaurant names, or dates. This data is not used for advertising and is not tied to an account.",
  },
```

Keep the existing "No cloud upload" sentence about shift/income records. That remains true: income content stays on device.

- [ ] **Step 5: Run tests**

Run: `cd tip-calendar-rn && npm test -- src/release/appConfig.test.ts`

Expected: PASS

Run: `cd tip-calendar-rn && npm test`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tip-calendar-rn/src/app/about-privacy.tsx tip-calendar-rn/app.json tip-calendar-rn/src/release/appConfig.test.ts
git commit -m "$(cat <<'EOF'
docs: declare anonymous analytics and crash data in privacy copy

EOF
)"
```

---

### Task 4: Native Firebase reporter (Expo Go no-op)

**Files:**

- Create: `tip-calendar-rn/src/features/analytics/firebaseNative.ts`
- Modify: `tip-calendar-rn/src/features/analytics/track.ts`
- Modify: `tip-calendar-rn/src/app/_layout.tsx`
- Modify: `tip-calendar-rn/src/test/setup.ts`
- Modify: `tip-calendar-rn/package.json` (via expo install)
- Modify: `tip-calendar-rn/package-lock.json`
- Create: `tip-calendar-rn/firebase.json`
- Modify: `tip-calendar-rn/app.json`

- [ ] **Step 1: Install native packages from `tip-calendar-rn/`**

Run:

```bash
cd tip-calendar-rn
npx expo install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics expo-build-properties
```

Expected: packages added with SDK 57-compatible versions.

- [ ] **Step 2: Mock native modules in Jest so existing tests keep booting**

Append to `tip-calendar-rn/src/test/setup.ts`:

```ts
jest.mock("@react-native-firebase/app", () => ({
  default: { app: () => ({}) },
}))
jest.mock("@react-native-firebase/analytics", () => ({
  default: () => ({
    logEvent: jest.fn().mockResolvedValue(undefined),
  }),
}))
jest.mock("@react-native-firebase/crashlytics", () => ({
  default: () => ({
    setCrashlyticsCollectionEnabled: jest.fn().mockResolvedValue(undefined),
  }),
}))
```

- [ ] **Step 3: Add `firebase.json` with advertising collection off**

Create `tip-calendar-rn/firebase.json`:

```json
{
  "react-native": {
    "analytics_auto_collection_enabled": true,
    "google_analytics_adid_collection_enabled": false,
    "google_analytics_default_allow_ad_personalization_signals": false,
    "crashlytics_auto_collection_enabled": true,
    "crashlytics_debug_enabled": false,
    "crashlytics_is_error_generation_on_js_crash_enabled": true,
    "crashlytics_javascript_exception_handler_chaining_enabled": true
  }
}
```

Do not set `google_analytics_idfv_collection_enabled` to false. IDFV is how anonymous iOS user counts work without IDFA.

- [ ] **Step 4: Point Expo config at the plist and plugins**

In `tip-calendar-rn/app.json` `expo.ios`, add:

```json
      "googleServicesFile": "./GoogleService-Info.plist",
```

next to `bundleIdentifier`.

In `expo.plugins`, append (after `expo-file-system`):

```json
      "@react-native-firebase/app",
      [
        "@react-native-firebase/crashlytics",
        {
          "ios": {
            "disableAutoCollection": false
          }
        }
      ],
      [
        "@react-native-firebase/analytics",
        {
          "ios": {
            "withoutAdIdSupport": true
          }
        }
      ],
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static",
            "forceStaticLinking": ["RNFBApp", "RNFBAnalytics", "RNFBCrashlytics"]
          }
        }
      ]
```

Confirm `GoogleService-Info.plist` `BUNDLE_ID` is `app.tipcalendar` (already copied). Add the plist to git in the commit for this task.

- [ ] **Step 5: Implement Expo Go-safe native init and reporter**

Create `tip-calendar-rn/src/features/analytics/firebaseNative.ts`:

```ts
import type { AnalyticsEventName, AnalyticsParams, AnalyticsReporter } from "./track"

export const logFirebaseEvent: AnalyticsReporter = async (name, params) => {
  const analytics = require("@react-native-firebase/analytics").default as () => {
    logEvent(event: AnalyticsEventName, eventParams?: AnalyticsParams): Promise<void>
  }
  await analytics().logEvent(name, params)
}

export async function initFirebaseNative(): Promise<void> {
  try {
    const crashlytics = require("@react-native-firebase/crashlytics").default as () => {
      setCrashlyticsCollectionEnabled(enabled: boolean): Promise<void>
    }
    await crashlytics().setCrashlyticsCollectionEnabled(true)
  } catch {
    if (__DEV__) {
      console.warn("Firebase skipped (Expo Go or native module missing)")
    }
  }
}
```

In `tip-calendar-rn/src/features/analytics/track.ts`, add:

```ts
export async function enableNativeAnalytics(): Promise<void> {
  try {
    const native = require("./firebaseNative") as typeof import("./firebaseNative")
    await native.initFirebaseNative()
    setAnalyticsReporter(async (name, params) => {
      try {
        await native.logFirebaseEvent(name, params)
      } catch {
        if (__DEV__) {
          console.warn(`Firebase event skipped: ${name}`)
        }
      }
    })
  } catch {
    if (__DEV__) {
      console.warn("Firebase skipped (Expo Go or native module missing)")
    }
  }
}
```

`require("./firebaseNative")` stays inside try so a missing native module never breaks import of `track.ts` in tests. Jest already mocks the firebase packages.

In `tip-calendar-rn/src/app/_layout.tsx`:

```ts
import { useEffect } from "react"
import { enableNativeAnalytics } from "@/features/analytics/track"
```

Inside `RootLayout`:

```ts
  useEffect(() => {
    void enableNativeAnalytics()
  }, [])
```

Keep that hook in `RootLayout` (the outer function), not `RootStack`, so Expo Go still mounts providers even if analytics no-ops.

- [ ] **Step 6: Run tests**

Run: `cd tip-calendar-rn && npm test`

Expected: PASS. `track.test.ts` still uses the injectable reporter; `resetAnalyticsReporter` restores noop so tests do not hit native.

- [ ] **Step 7: Commit**

```bash
git add tip-calendar-rn/package.json tip-calendar-rn/package-lock.json \
  tip-calendar-rn/firebase.json tip-calendar-rn/GoogleService-Info.plist \
  tip-calendar-rn/app.json tip-calendar-rn/src/test/setup.ts \
  tip-calendar-rn/src/features/analytics/firebaseNative.ts \
  tip-calendar-rn/src/features/analytics/track.ts \
  tip-calendar-rn/src/app/_layout.tsx
git commit -m "$(cat <<'EOF'
feat: wire Firebase Analytics and Crashlytics for EAS iOS builds

EOF
)"
```

---

### Task 5: Manual EAS verification (no production crash button)

Do not add a Test Crash button to the UI.

- [ ] **Step 1: Development build**

From `tip-calendar-rn/`:

```bash
npx eas build --profile development --platform ios
```

Install the development client on a simulator or device. Expo Go will still no-op analytics; that is expected.

- [ ] **Step 2: Confirm Analytics**

Open the installed build, skip or finish onboarding, save one shift. In Firebase console → Analytics → Events, look for `first_open` and `shift_saved` (can take several hours; DebugView is faster if you enable it on a debug build).

- [ ] **Step 3: Confirm Crashlytics**

On a **development or preview** build only, temporarily add this in a screen you can tap, install, force the crash **without the Xcode debugger attached**, relaunch, then delete the button before any production commit:

```ts
import crashlytics from "@react-native-firebase/crashlytics"
crashlytics().crash()
```

Firebase Crashlytics dashboard for `app.tipcalendar` should leave the Add SDK empty state after the first report.

- [ ] **Step 4: Expo Go smoke check**

`npx expo start --ios` → Skip for now → save is not required. App must not throw `Native module not found`. Metro may print `Firebase skipped (Expo Go or native module missing)`.

No commit unless you had to revert a leftover crash button.

---

## Spec coverage

| Spec item | Task |
|---|---|
| RN Firebase Analytics + Crashlytics | 4 |
| No IDFA / ATT, `NSPrivacyTracking` false | 3, 4 (`withoutAdIdSupport`, firebase.json) |
| Custom events without income/name/date | 1, 2 |
| `track` never blocks save | 1 |
| Expo Go no-op | 4, 5 |
| About copy + privacy manifests | 3 |
| `appConfig.test.ts` collected types | 3 |
| GoogleService-Info.plist | 4 (git add) |
| No Auth/Remote Config/AdMob | (not added) |
| No H5 changes | (not touched) |
| Test crash not left in production | 5 (manual, revert) |

## Out of plan

- App Store Connect privacy questionnaire (fill at submit time using the same Usage + Crash Data answers)
- Android google-services.json (no Android app in Firebase yet)
- DebugView automation
