# Phase 1: Onboarding + Empty Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A first-time user creates one restaurant in three onboarding steps and lands on the empty calendar; a returning user with a restaurant skips Onboarding.

**Architecture:** Hydrate `AppState` at the root. Zero restaurants → full-screen `src/app/onboarding/index.tsx`. Completing Onboarding writes one default restaurant through `createLocalStore` and the existing `createRestaurant` factory. Calendar this phase shows month chrome, zero summary cards, a faded `buildMonthGrid`, and the empty overlay. Tapping a date does not open Record Shift.

**Tech Stack:** Expo Router Stack + existing Tabs, NativeWind, `createLocalStore` / `createRestaurant` / `buildMonthGrid` / `formatUsd` from Phase 0.

**Depends on:** Phase 0 on `master`.

**Figma (file `ifAdYyy4qP0UXjbj7AX7Jx`):**

| 画板 | node | 行为 |
|---|---|---|
| `onboarding-step1-restaurant` | `71:7` | 标题 Name your restaurant；名称必填才能 Next |
| `onboarding-step2-base-pay` | `71:40` | Hourly / Per Shift / No Base；可 Skip |
| `onboarding-step3-tipout` | `71:85` | None / Fixed / % Sales / % Tips；Get Started 或 Skip |
| `calendar-empty-state` | `48:49` | Tip Calendar、三张 `—` 卡、淡月历、空状态 overlay |

不实现 `[old] onboarding-welcome`。不要画系统状态栏。主色继续用 Phase 0 token `#0066CC`，不要改成 Figma 的 `#007AFF`。

**Figma vs 产品规则：** 画板 Step 1 有 Skip for now。需求是名称未填不能下一步，Skip 只允许 Step 2 / 3。Step 1 不渲染 Skip。

**本阶段不对齐：** 点日期进表单、绿色金额、Day Details、Stats/Me 内容。

---

## File map

Create:

- `tip-calendar-rn/src/state/session.ts`
- `tip-calendar-rn/src/state/session.test.ts`
- `tip-calendar-rn/src/state/AppStateContext.tsx`
- `tip-calendar-rn/src/features/onboarding/onboardingDraft.ts`
- `tip-calendar-rn/src/features/onboarding/onboardingDraft.test.ts`
- `tip-calendar-rn/src/features/onboarding/OnboardingFlow.tsx`
- `tip-calendar-rn/src/features/onboarding/StepRestaurant.tsx`
- `tip-calendar-rn/src/features/onboarding/StepBasePay.tsx`
- `tip-calendar-rn/src/features/onboarding/StepTipOut.tsx`
- `tip-calendar-rn/src/features/calendar/CalendarMonth.tsx`
- `tip-calendar-rn/src/features/calendar/EmptyShiftOverlay.tsx`
- `tip-calendar-rn/src/components/PrimaryButton.tsx`
- `tip-calendar-rn/src/components/TextField.tsx`
- `tip-calendar-rn/src/components/SegmentedControl.tsx`
- `tip-calendar-rn/src/app/onboarding/index.tsx`
- `tip-calendar-rn/assets/images/calendar-x.png` (download Figma asset `74f758ff-f84a-4c1d-af8d-eeea31af4a19`)

Modify:

- `tip-calendar-rn/src/app/_layout.tsx` — provider + onboarding gate
- `tip-calendar-rn/src/app/(tabs)/index.tsx` — empty calendar
- `docs/plans/README.md` — 阶段 1 状态

---

### Task 1: Onboarding gate helper

**Files:**
- Create: `tip-calendar-rn/src/state/session.ts`
- Create: `tip-calendar-rn/src/state/session.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { createRestaurant } from "../domain/restaurant"
import { emptyState } from "../storage/types"
import { needsOnboarding } from "./session"

describe("needsOnboarding", () => {
  it("is true only when there are no restaurants", () => {
    expect(needsOnboarding(emptyState)).toBe(true)
    expect(
      needsOnboarding({
        ...emptyState,
        restaurants: [createRestaurant({ name: "Bluebird" })],
      }),
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd tip-calendar-rn && npm test -- src/state/session.test.ts
```

Expected: FAIL because `./session` cannot be resolved.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { AppState } from "../storage/types"

export function needsOnboarding(state: AppState): boolean {
  return state.restaurants.length === 0
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/state/session.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/state/session.ts tip-calendar-rn/src/state/session.test.ts
git commit -m "$(cat <<'EOF'
feat: gate first launch on empty restaurant list

EOF
)"
```

---

### Task 2: Onboarding draft reducer

**Files:**
- Create: `tip-calendar-rn/src/features/onboarding/onboardingDraft.ts`
- Create: `tip-calendar-rn/src/features/onboarding/onboardingDraft.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { canContinueStep, completeOnboarding, reduceOnboarding } from "./onboardingDraft"

const start = reduceOnboarding(undefined, { type: "init" })

it("blocks step 1 without a trimmed name", () => {
  expect(canContinueStep(start)).toBe(false)
  const named = reduceOnboarding(start, { type: "setName", name: "  Bluebird  " })
  expect(canContinueStep(named)).toBe(true)
})

it("keeps skipped pay and tip-out as unset", () => {
  let draft = reduceOnboarding(start, { type: "setName", name: "Bluebird" })
  draft = reduceOnboarding(draft, { type: "next" })
  draft = reduceOnboarding(draft, { type: "skipPay" })
  draft = reduceOnboarding(draft, { type: "skipTipOut" })
  const restaurant = completeOnboarding(draft, "2026-08-21T20:00:00.000Z")
  expect(restaurant.name).toBe("Bluebird")
  expect(restaurant.isDefault).toBe(true)
  expect(restaurant.payType).toBe("none")
  expect(restaurant.payAmountCents).toBe(0)
  expect(restaurant.defaultTipOutRule).toEqual({ type: "none" })
})

it("stores hourly pay and a tips-percent rule", () => {
  let draft = reduceOnboarding(undefined, { type: "init" })
  draft = reduceOnboarding(draft, { type: "setName", name: "Harbor" })
  draft = reduceOnboarding(draft, { type: "next" })
  draft = reduceOnboarding(draft, {
    type: "setPay",
    payType: "hourly",
    payAmountCents: 1800,
  })
  draft = reduceOnboarding(draft, { type: "next" })
  draft = reduceOnboarding(draft, {
    type: "setTipOut",
    rule: { type: "tips_percent", percent: 3 },
  })
  const restaurant = completeOnboarding(draft, "2026-08-21T20:00:00.000Z")
  expect(restaurant.payType).toBe("hourly")
  expect(restaurant.payAmountCents).toBe(1800)
  expect(restaurant.defaultTipOutRule).toEqual({ type: "tips_percent", percent: 3 })
})

it("requires an amount when hourly or fixed is selected", () => {
  let draft = reduceOnboarding(start, { type: "setName", name: "Bluebird" })
  draft = reduceOnboarding(draft, { type: "next" })
  draft = reduceOnboarding(draft, { type: "setPay", payType: "hourly", payAmountCents: 0 })
  expect(canContinueStep(draft)).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/features/onboarding/onboardingDraft.test.ts
```

Expected: FAIL because the module is missing.

- [ ] **Step 3: Write implementation**

```ts
import { createRestaurant, type PayType, type Restaurant, type TipOutRule } from "../../domain/restaurant"

export type OnboardingStep = 1 | 2 | 3

export type OnboardingDraft = {
  step: OnboardingStep
  name: string
  payType: PayType
  payAmountCents: number
  tipOutRule: TipOutRule
}

export type OnboardingAction =
  | { type: "init" }
  | { type: "setName"; name: string }
  | { type: "next" }
  | { type: "back" }
  | { type: "setPay"; payType: PayType; payAmountCents: number }
  | { type: "skipPay" }
  | { type: "setTipOut"; rule: TipOutRule }
  | { type: "skipTipOut" }

export function reduceOnboarding(
  draft: OnboardingDraft | undefined,
  action: OnboardingAction,
): OnboardingDraft {
  const current: OnboardingDraft = draft ?? {
    step: 1,
    name: "",
    payType: "none",
    payAmountCents: 0,
    tipOutRule: { type: "none" },
  }

  switch (action.type) {
    case "init":
      return current
    case "setName":
      return { ...current, name: action.name }
    case "next":
      return { ...current, step: Math.min(3, (current.step + 1) as OnboardingStep) }
    case "back":
      return { ...current, step: Math.max(1, (current.step - 1) as OnboardingStep) }
    case "setPay":
      return { ...current, payType: action.payType, payAmountCents: action.payAmountCents }
    case "skipPay":
      return { ...current, payType: "none", payAmountCents: 0, step: 3 }
    case "setTipOut":
      return { ...current, tipOutRule: action.rule }
    case "skipTipOut":
      return { ...current, tipOutRule: { type: "none" } }
  }
}

export function canContinueStep(draft: OnboardingDraft): boolean {
  if (draft.step === 1) {
    return draft.name.trim().length > 0
  }
  if (draft.step === 2) {
    if (draft.payType === "none") {
      return true
    }
    return draft.payAmountCents > 0
  }
  if (draft.tipOutRule.type === "fixed") {
    return draft.tipOutRule.amountCents > 0
  }
  if (draft.tipOutRule.type === "sales_percent" || draft.tipOutRule.type === "tips_percent") {
    return draft.tipOutRule.percent > 0
  }
  return true
}

export function completeOnboarding(draft: OnboardingDraft, now: string): Restaurant {
  return createRestaurant({
    name: draft.name,
    isDefault: true,
    payType: draft.payType,
    payAmountCents: draft.payAmountCents,
    defaultTipOutRule: draft.tipOutRule,
    now,
  })
}
```

`skipPay` jumps to step 3. `skipTipOut` only clears the rule; the screen then calls `completeOnboarding`.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/features/onboarding/onboardingDraft.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/features/onboarding/onboardingDraft.ts tip-calendar-rn/src/features/onboarding/onboardingDraft.test.ts
git commit -m "$(cat <<'EOF'
feat: add onboarding draft rules and skip behavior

EOF
)"
```

---

### Task 3: App state provider and route gate

**Files:**
- Create: `tip-calendar-rn/src/state/AppStateContext.tsx`
- Create: `tip-calendar-rn/src/app/onboarding/index.tsx`
- Modify: `tip-calendar-rn/src/app/_layout.tsx`

- [ ] **Step 1: Implement the provider**

```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { createLocalStore } from "../storage/localStore"
import { emptyState, type AppState } from "../storage/types"

const store = createLocalStore()

type AppStateContextValue = {
  state: AppState
  ready: boolean
  updateState: (updater: (current: AppState) => AppState) => Promise<void>
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void store.load().then((loaded) => {
      setState(loaded)
      setReady(true)
    })
  }, [])

  const updateState = useCallback(async (updater: (current: AppState) => AppState) => {
    const next = updater(state)
    await store.save(next)
    setState(next)
  }, [state])

  return (
    <AppStateContext.Provider value={{ state, ready, updateState }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppStateContextValue {
  const value = useContext(AppStateContext)
  if (!value) {
    throw new Error("useAppState must be used inside AppStateProvider")
  }
  return value
}
```

Root layout: wrap with `AppStateProvider`. While `!ready`, return `null`. If `needsOnboarding(state)`, render `Stack.Screen name="onboarding/index"` only; otherwise `(tabs)`. Do not put Onboarding inside the tab navigator.

Temporary `src/app/onboarding/index.tsx` can return a white `View` until Task 4.

- [ ] **Step 2: Verify gate by wiping storage**

In a unit-less smoke: with empty `AppState`, root must not mount `(tabs)` first. After `restaurants.length > 0`, onboarding route is gone.

- [ ] **Step 3: Commit**

```bash
git add tip-calendar-rn/src/state/AppStateContext.tsx tip-calendar-rn/src/app/_layout.tsx tip-calendar-rn/src/app/onboarding/index.tsx
git commit -m "$(cat <<'EOF'
feat: hydrate local state and show onboarding when empty

EOF
)"
```

---

### Task 4: Onboarding UI (three steps)

**Files:**
- Create: `tip-calendar-rn/src/components/PrimaryButton.tsx`
- Create: `tip-calendar-rn/src/components/TextField.tsx`
- Create: `tip-calendar-rn/src/components/SegmentedControl.tsx`
- Create: `tip-calendar-rn/src/features/onboarding/StepRestaurant.tsx`
- Create: `tip-calendar-rn/src/features/onboarding/StepBasePay.tsx`
- Create: `tip-calendar-rn/src/features/onboarding/StepTipOut.tsx`
- Create: `tip-calendar-rn/src/features/onboarding/OnboardingFlow.tsx`
- Modify: `tip-calendar-rn/src/app/onboarding/index.tsx`

Layout (all steps): white canvas, horizontal padding 24, content from the top, bottom actions above the home indicator. Do not implement a fake status bar.

Shared chrome:

- Centered gray `Step N of 3`
- Step 2/3: blue `Back` with chevron (SF Symbol `chevron.left` or `expo-symbols`)
- Title 34 extra-bold, subtitle 17 muted
- Uppercase 13 muted field labels
- Primary: height 50, pill `rounded-full`, `#0066CC`, 17 semibold white
- Skip: 15 medium `#0066CC`, only on steps 2 and 3

**Step 1 copy (Figma):**

- Title: `Name your restaurant`
- Subtitle: `Add your first restaurant to start tracking tips.`
- Label: `RESTAURANT NAME`
- Placeholder: `e.g., The Olive Garden`
- Helper: `This will be set as your default restaurant.`
- Button: `Next` disabled until `canContinueStep`

**Step 2 copy:**

- Title: `Set your base pay`
- Subtitle: `How are you paid before tips?`
- Segments: `Hourly` | `Per Shift` | `No Base`
- Hourly field: label `HOURLY RATE`, prefix `$`, suffix `/ hr`, decimal pad
- Per Shift field: label `PER SHIFT`, prefix `$`, no suffix
- No Base: hide amount field
- Convert dollars with `dollarsToCents` on Next
- `Skip for now` → `{ type: "skipPay" }`

**Step 3 copy:**

- Title: `Tip-out rule`
- Subtitle: `Do you share a portion of your tips?`
- Segments: `None` | `Fixed` | `% Sales` | `% Tips`
- Helper text:
  - None: `No tip-out will be deducted.`
  - Fixed: `A fixed amount is deducted each shift.`
  - % Sales: `A percentage of sales is deducted.`
  - % Tips: `A percentage of total tips is deducted.`
- Fixed shows amount field; percent types show a percent field
- Primary: `Get Started` → `completeOnboarding` then `updateState`
- `Skip for now` → skipTipOut then the same save

On save:

```ts
const restaurant = completeOnboarding(draft, new Date().toISOString())
await updateState((current) => ({
  ...current,
  restaurants: [restaurant],
}))
```

Do not `router.replace` if the root gate already swaps stacks when restaurants exist.

- [ ] **Step 1: Implement the three screens against Figma copy and layout**

Download is not needed for onboarding (no custom icons besides Back chevron).

- [ ] **Step 2: Manual path**

1. Empty store → Step 1.
2. Empty Next stays disabled.
3. Type a name → Next → Step 2.
4. Skip pay → Step 3.
5. Skip tip-out → empty calendar.
6. Kill and relaunch → calendar, not Onboarding.

- [ ] **Step 3: Commit**

```bash
git add tip-calendar-rn/src/components tip-calendar-rn/src/features/onboarding tip-calendar-rn/src/app/onboarding
git commit -m "$(cat <<'EOF'
feat: add three-step restaurant onboarding

EOF
)"
```

---

### Task 5: Empty calendar

**Files:**
- Create: `tip-calendar-rn/src/features/calendar/CalendarMonth.tsx`
- Create: `tip-calendar-rn/src/features/calendar/EmptyShiftOverlay.tsx`
- Create: `tip-calendar-rn/assets/images/calendar-x.png`
- Modify: `tip-calendar-rn/src/app/(tabs)/index.tsx`

- [ ] **Step 1: Download the empty-state icon**

```bash
curl -L -o tip-calendar-rn/assets/images/calendar-x.png \
  "https://www.figma.com/api/mcp/asset/74f758ff-f84a-4c1d-af8d-eeea31af4a19"
```

If the URL returns SVG, save as `calendar-x.svg` and render with `expo-image`. Size the leaf to 32×32 inside a 64 circular parchment wrap.

- [ ] **Step 2: Build calendar chrome from `calendar-empty-state`**

Top to bottom, padding 20:

1. Bold 32 left-aligned `Tip Calendar` (this Figma frame, not “Tips Calendar”).
2. Month + year 20 bold left; two 20×20 chevrons right. `buildMonthGrid` + local `Date`.
3. Three parchment cards, radius 12: `This Week` / `This Month` / `Hourly`, values `—`.
4. Weekday row `S M T W T F S` (Sunday first; `weekStartsOn: 0`).
5. Month grid from `buildMonthGrid`. Cells 52 tall, no border/shadow. Empty days blank. Date numbers 14. Selected day: `#0066CC` rounded rect, white number. Default selected = today if in month, else the 1st.
6. Grid sits at opacity ~0.15. Overlay centered: calendar-x icon, `No shifts recorded yet`, `Tap any date to add your first shift`.
7. Tab bar already comes from `(tabs)/_layout.tsx`.

Chevron changes month. Taps only change the selected day. Do not navigate to Record Shift.

- [ ] **Step 3: Verify after onboarding**

Create a restaurant with Skip on pay and tip-out. Confirm overlay, `—` cards, and relaunch still shows Calendar.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all previous tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/features/calendar tip-calendar-rn/src/app/(tabs)/index.tsx tip-calendar-rn/assets/images/calendar-x.png docs/plans/README.md
git commit -m "$(cat <<'EOF'
feat: show empty calendar after onboarding

EOF
)"
```

---

## Acceptance

- Fresh install shows Onboarding, never Calendar first.
- Step 1 cannot continue without a name; no Skip on Step 1.
- Skip on steps 2 and 3 still creates a default restaurant with `payType: "none"` and `defaultTipOutRule: { type: "none" }`.
- After finish, Calendar matches `calendar-empty-state`: title, chevrons, three `—` cards, faded grid, overlay copy.
- Second launch skips Onboarding.
- Date taps do not open a shift form.

## Out of this phase

Record Shift, saving shifts, green day amounts, Day Details, Stats body, Me list.
