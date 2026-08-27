# Local Storage Schema v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist a `schemaVersion: 2` document where shifts freeze restaurant name, pay, tip-out, and net income so history stays correct after restaurant rules change or a restaurant is deleted.

**Architecture:** Keep one AsyncStorage blob at `tips-calendar/v1`. Domain types become the v2 document. A pure `migrateToV2` function upgrades `version: 1` payloads on load and on JSON import. Calendar, Stats, Day Details, and CSV read `incomeSnapshot` and `displayRestaurantName`; only the unsaved form still calls `calculateShiftIncome`.

**Tech Stack:** TypeScript, Jest (`npm test` from `tip-calendar-rn/`), existing `src/domain` and `src/storage` modules. No new packages. Do not change H5 `src/`.

**Spec:** `docs/superpowers/specs/2026-08-27-local-storage-schema-design.md`

---

## File map

Create:

- `tip-calendar-rn/src/storage/migrate.ts` — detect v1/v2, migrate, import vs load strictness
- `tip-calendar-rn/src/storage/migrate.test.ts`

Modify:

- `tip-calendar-rn/src/domain/restaurant.ts` — drop `isDefault`; UUID ids
- `tip-calendar-rn/src/domain/restaurant.test.ts`
- `tip-calendar-rn/src/domain/shift.ts` — flattened snapshots, required `paySnapshot` / `restaurantName` / `incomeSnapshot`, UUID, `tipOutRuleFromSnapshot`
- `tip-calendar-rn/src/domain/shift.test.ts`
- `tip-calendar-rn/src/domain/calendar.test.ts` — Shift literals
- `tip-calendar-rn/src/storage/types.ts` — `schemaVersion: 2`, `defaultRestaurantId`
- `tip-calendar-rn/src/storage/localStore.ts` — migrate on load, persist v2
- `tip-calendar-rn/src/storage/localStore.test.ts`
- `tip-calendar-rn/src/features/shift/shiftIncome.ts` — read snapshots; `displayRestaurantName`
- `tip-calendar-rn/src/features/shift/shiftDraft.ts` — write all snapshots; orphan restaurant save
- `tip-calendar-rn/src/features/shift/shiftDraft.test.ts`
- `tip-calendar-rn/src/features/shift/calculationBreakdown.ts` — flattened `tipOutSnapshot.type`
- `tip-calendar-rn/src/features/calendar/calendarSummary.ts` — net from snapshot
- `tip-calendar-rn/src/features/calendar/calendarSummary.test.ts`
- `tip-calendar-rn/src/features/calendar/DayDetailsSheet.tsx` — snapshot numbers and frozen name
- `tip-calendar-rn/src/features/stats/statsSummary.ts`
- `tip-calendar-rn/src/features/stats/statsSummary.test.ts`
- `tip-calendar-rn/src/features/restaurant/restaurantList.ts` — `nextDefaultRestaurantId`
- `tip-calendar-rn/src/features/restaurant/restaurantList.test.ts`
- `tip-calendar-rn/src/features/onboarding/onboardingDraft.ts`
- `tip-calendar-rn/src/features/onboarding/OnboardingFlow.tsx`
- `tip-calendar-rn/src/features/backup/backup.ts`
- `tip-calendar-rn/src/features/backup/backup.test.ts`
- `tip-calendar-rn/src/app/restaurant/index.tsx`
- `tip-calendar-rn/src/app/restaurant/[id].tsx`
- `tip-calendar-rn/src/app/shift/new.tsx`
- `tip-calendar-rn/src/app/shift/[id].tsx`

Do not modify: H5 `src/`, `STORAGE_KEY`, sync/login fields.

After each task, run tests from `tip-calendar-rn/` (`npm test -- <file>`). Every commit in this plan is `cd` to repo root then `git add` the listed files.

---

### Task 1: Default restaurant lives in preferences

**Files:**

- Modify: `tip-calendar-rn/src/domain/restaurant.ts`
- Modify: `tip-calendar-rn/src/domain/restaurant.test.ts`
- Modify: `tip-calendar-rn/src/storage/types.ts`
- Modify: `tip-calendar-rn/src/features/restaurant/restaurantList.ts`
- Modify: `tip-calendar-rn/src/features/restaurant/restaurantList.test.ts`
- Modify: `tip-calendar-rn/src/storage/localStore.test.ts`
- Modify: `tip-calendar-rn/src/features/onboarding/onboardingDraft.ts`
- Modify: `tip-calendar-rn/src/features/onboarding/OnboardingFlow.tsx`
- Modify: `tip-calendar-rn/src/app/restaurant/index.tsx`
- Modify: `tip-calendar-rn/src/app/restaurant/[id].tsx`
- Modify: `tip-calendar-rn/src/app/shift/new.tsx`
- Modify: `tip-calendar-rn/src/features/calendar/DayDetailsSheet.tsx` (placeholder restaurant only)

- [ ] **Step 1: Rewrite restaurant tests for no `isDefault` and UUID ids**

Replace `tip-calendar-rn/src/domain/restaurant.test.ts` with:

```ts
import { createRestaurant } from "./restaurant"

describe("createRestaurant", () => {
  it("trims the name and uses a UUID when id is omitted", () => {
    const restaurant = createRestaurant({
      name: "  Bluebird Diner  ",
      now: "2026-08-21T20:00:00.000Z",
    })

    expect(restaurant.name).toBe("Bluebird Diner")
    expect(restaurant.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(restaurant.payType).toBe("none")
    expect(restaurant.payAmountCents).toBe(0)
    expect(restaurant.defaultTipOutRule).toEqual({ type: "none" })
    expect(restaurant.creditCardTipPayout).toBe("same_day")
    expect("isDefault" in restaurant).toBe(false)
  })

  it("rejects a blank name", () => {
    expect(() => createRestaurant({ name: "   " })).toThrow("Restaurant name is required")
  })

  it("keeps an explicit id", () => {
    const restaurant = createRestaurant({
      name: "Harbor Grill",
      payType: "hourly",
      payAmountCents: 1500,
      defaultTipOutRule: { type: "tips_percent", percent: 3 },
      id: "rst_1",
    })
    expect(restaurant.id).toBe("rst_1")
    expect(restaurant.payType).toBe("hourly")
    expect(restaurant.payAmountCents).toBe(1500)
    expect(restaurant.defaultTipOutRule).toEqual({ type: "tips_percent", percent: 3 })
  })
})
```

- [ ] **Step 2: Run the restaurant test and confirm it fails**

Run: `cd tip-calendar-rn && npm test -- src/domain/restaurant.test.ts`

Expected: FAIL (`isDefault` still exists, or id is `rst_${now}`)

- [ ] **Step 3: Update restaurant domain and AppState types**

In `restaurant.ts`:

- Remove `isDefault` from `Restaurant` and from `createRestaurant` input.
- Default id: `input.id ?? crypto.randomUUID()`.
- Add `defaultRestaurantId: string | null` to `Preferences`.

```ts
export type Preferences = {
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  currencySymbol: string
  timeFormat: "12h" | "24h"
  defaultRestaurantId: string | null
}

export type Restaurant = {
  id: string
  name: string
  payType: PayType
  payAmountCents: Cents
  creditCardTipPayout: CreditCardTipPayout
  defaultTipOutRule: TipOutRule
  createdAt: string
  updatedAt: string
}

export function createRestaurant(input: {
  name: string
  payType?: PayType
  payAmountCents?: Cents
  creditCardTipPayout?: CreditCardTipPayout
  defaultTipOutRule?: TipOutRule
  now?: string
  id?: string
}): Restaurant {
  const name = input.name.trim()
  if (name.length === 0) {
    throw new Error("Restaurant name is required")
  }
  const now = input.now ?? new Date().toISOString()
  return {
    id: input.id ?? crypto.randomUUID(),
    name,
    payType: input.payType ?? "none",
    payAmountCents: input.payAmountCents ?? 0,
    creditCardTipPayout: input.creditCardTipPayout ?? "same_day",
    defaultTipOutRule: input.defaultTipOutRule ?? { type: "none" },
    createdAt: now,
    updatedAt: now,
  }
}
```

In `storage/types.ts` keep `version: 1` for this task (schema bump is Task 3). Add `defaultRestaurantId: null` to `defaultPreferences` and `emptyState.preferences`.

```ts
export const defaultPreferences: Preferences = {
  weekStartsOn: 0,
  currencySymbol: "$",
  timeFormat: "12h",
  defaultRestaurantId: null,
}
```

- [ ] **Step 4: Rewrite restaurantList helpers**

Replace `restaurantList.ts` default-boolean logic with:

```ts
export function upsertRestaurant(
  restaurants: Restaurant[],
  restaurant: Restaurant,
): Restaurant[] {
  const exists = restaurants.some((item) => item.id === restaurant.id)
  return exists
    ? restaurants.map((item) => (item.id === restaurant.id ? restaurant : item))
    : [...restaurants, restaurant]
}

export function removeRestaurant(restaurants: Restaurant[], id: string): Restaurant[] {
  return restaurants.filter((item) => item.id !== id)
}

export function nextDefaultRestaurantId(
  restaurants: Restaurant[],
  currentId: string | null,
): string | null {
  if (currentId && restaurants.some((item) => item.id === currentId)) {
    return currentId
  }
  return restaurants[0]?.id ?? null
}
```

Replace `restaurantList.test.ts`:

```ts
import { createRestaurant } from "../../domain/restaurant"
import { nextDefaultRestaurantId, paySummary, removeRestaurant, upsertRestaurant } from "./restaurantList"

const bluebird = createRestaurant({
  name: "Bluebird",
  now: "2026-08-21T20:00:00.000Z",
  id: "rst_1",
})
const harbor = createRestaurant({
  name: "Harbor",
  now: "2026-08-21T21:00:00.000Z",
  id: "rst_2",
})

describe("upsertRestaurant", () => {
  it("adds a restaurant without touching other rows", () => {
    const next = upsertRestaurant([bluebird], harbor)
    expect(next).toHaveLength(2)
    expect(next.map((item) => item.id)).toEqual(["rst_1", "rst_2"])
  })
})

describe("removeRestaurant", () => {
  it("deletes the row and leaves shifts to the caller", () => {
    expect(removeRestaurant([bluebird, harbor], "rst_1")).toEqual([harbor])
  })
})

describe("nextDefaultRestaurantId", () => {
  it("keeps the current default when it still exists", () => {
    expect(nextDefaultRestaurantId([bluebird, harbor], "rst_2")).toBe("rst_2")
  })

  it("falls back to the first remaining restaurant", () => {
    expect(nextDefaultRestaurantId([harbor], "rst_1")).toBe("rst_2")
  })

  it("is null when no restaurants remain", () => {
    expect(nextDefaultRestaurantId([], "rst_1")).toBeNull()
  })
})

describe("paySummary", () => {
  it("describes hourly pay", () => {
    expect(paySummary({ ...bluebird, payType: "hourly", payAmountCents: 1500 })).toBe(
      "Hourly $15.00/hr",
    )
  })
})
```

Fix the fallback test: after removing bluebird, remaining is `[harbor]`, so `nextDefaultRestaurantId([harbor], "rst_1")` is `"rst_2"`. The test above is correct.

- [ ] **Step 5: Wire screens and onboarding**

`completeOnboarding`: drop `isDefault: true`.

`OnboardingFlow.saveRestaurant`:

```ts
const restaurant = completeOnboarding(next, new Date().toISOString())
await updateState((current) => ({
  ...current,
  restaurants: [restaurant],
  preferences: { ...current.preferences, defaultRestaurantId: restaurant.id },
}))
```

`app/shift/new.tsx` default id:

```ts
const defaultId =
  state.preferences.defaultRestaurantId &&
  state.restaurants.some((item) => item.id === state.preferences.defaultRestaurantId)
    ? state.preferences.defaultRestaurantId
    : state.restaurants[0]?.id
```

`app/restaurant/index.tsx` sort/subtitle: compare `state.preferences.defaultRestaurantId === restaurant.id` instead of `isDefault`.

`app/restaurant/[id].tsx`:

- `useState` for default: `existing?.id === state.preferences.defaultRestaurantId || state.restaurants.length === 0`
- Save must not write `isDefault` on the restaurant object.
- After upsert/remove, set `preferences.defaultRestaurantId` via `nextDefaultRestaurantId`.

Save snippet:

```ts
await updateState((current) => {
  const restaurants = upsertRestaurant(current.restaurants, restaurant)
  const defaultRestaurantId = isDefault
    ? restaurant.id
    : nextDefaultRestaurantId(
        restaurants,
        current.preferences.defaultRestaurantId === restaurant.id
          ? null
          : current.preferences.defaultRestaurantId,
      )
  return {
    ...current,
    restaurants,
    preferences: { ...current.preferences, defaultRestaurantId },
  }
})
```

When unchecking default on the only restaurant, `nextDefaultRestaurantId(restaurants, null)` returns that restaurant’s id. That keeps `defaultRestaurantId` pointing at an existing row.

Delete snippet:

```ts
await updateState((current) => {
  const restaurants = removeRestaurant(current.restaurants, existing.id)
  return {
    ...current,
    restaurants,
    preferences: {
      ...current.preferences,
      defaultRestaurantId: nextDefaultRestaurantId(restaurants, current.preferences.defaultRestaurantId),
    },
  }
})
```

`DayDetailsSheet` placeholder restaurant: delete `isDefault: false`.

`localStore.test.ts` expected empty preferences: add `defaultRestaurantId: null`. Same for any `emptyState` assertions.

- [ ] **Step 6: Run focused tests**

Run: `cd tip-calendar-rn && npm test -- src/domain/restaurant.test.ts src/features/restaurant/restaurantList.test.ts src/storage/localStore.test.ts src/features/onboarding/onboardingDraft.test.ts src/state/session.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add tip-calendar-rn/src/domain/restaurant.ts tip-calendar-rn/src/domain/restaurant.test.ts tip-calendar-rn/src/storage/types.ts tip-calendar-rn/src/storage/localStore.test.ts tip-calendar-rn/src/features/restaurant/restaurantList.ts tip-calendar-rn/src/features/restaurant/restaurantList.test.ts tip-calendar-rn/src/features/onboarding/onboardingDraft.ts tip-calendar-rn/src/features/onboarding/OnboardingFlow.tsx tip-calendar-rn/src/app/restaurant/index.tsx tip-calendar-rn/src/app/restaurant/[id].tsx tip-calendar-rn/src/app/shift/new.tsx tip-calendar-rn/src/features/calendar/DayDetailsSheet.tsx
git commit -m "$(cat <<'EOF'
refactor: store default restaurant on preferences instead of restaurant rows

Keep restaurant records as templates so a later backend can treat default as a per-user preference.
EOF
)"
```

---

### Task 2: Flatten shift snapshots and freeze income

**Files:**

- Modify: `tip-calendar-rn/src/domain/shift.ts`
- Modify: `tip-calendar-rn/src/domain/shift.test.ts`
- Modify: `tip-calendar-rn/src/domain/calendar.test.ts`
- Modify: `tip-calendar-rn/src/features/shift/shiftIncome.ts`
- Modify: `tip-calendar-rn/src/features/shift/shiftDraft.ts`
- Modify: `tip-calendar-rn/src/features/shift/shiftDraft.test.ts`
- Modify: `tip-calendar-rn/src/features/shift/calculationBreakdown.ts`
- Modify: `tip-calendar-rn/src/features/calendar/calendarSummary.ts`
- Modify: `tip-calendar-rn/src/features/calendar/calendarSummary.test.ts`
- Modify: `tip-calendar-rn/src/features/stats/statsSummary.ts`
- Modify: `tip-calendar-rn/src/features/stats/statsSummary.test.ts`
- Modify: `tip-calendar-rn/src/features/backup/backup.ts`
- Modify: `tip-calendar-rn/src/features/backup/backup.test.ts`

- [ ] **Step 1: Add failing snapshot tests to `shift.test.ts`**

Keep existing hour/income tests. Change the tip-out and `createShift` cases:

```ts
it("snapshots sales-percent tip-out with base, rate, and amount", () => {
  const restaurant = createRestaurant({
    name: "Sales Place",
    payType: "none",
    defaultTipOutRule: { type: "sales_percent", percent: 3 },
  })
  const income = calculateShiftIncome({
    restaurant,
    hours: 5,
    cashTipsCents: 1000,
    cardTipsCents: 1000,
    salesCents: 85000,
  })
  expect(income.tipOutSnapshot).toEqual({
    type: "sales_percent",
    baseAmountCents: 85000,
    percent: 3,
    amountCents: 2550,
  })
  expect(income.tipOutCents).toBe(2550)
})

it("snapshots tips-percent using total tips as the base", () => {
  const restaurant = createRestaurant({
    name: "Tip Out Place",
    payType: "none",
    defaultTipOutRule: { type: "tips_percent", percent: 3 },
  })
  const income = calculateShiftIncome({
    restaurant,
    hours: 5,
    cashTipsCents: 4000,
    cardTipsCents: 6000,
  })
  expect(income.tipOutSnapshot).toEqual({
    type: "tips_percent",
    baseAmountCents: 10000,
    percent: 3,
    amountCents: 300,
  })
})

it("snapshots a manual amount as manual, not fixed", () => {
  const restaurant = createRestaurant({ name: "Override Place" })
  const income = calculateShiftIncome({
    restaurant,
    hours: 5,
    cashTipsCents: 10000,
    cardTipsCents: 0,
    tipOutOverride: { type: "manual", amountCents: 250 },
  })
  expect(income.tipOutSnapshot).toEqual({ type: "manual", amountCents: 250 })
})

it("stores restaurantName, paySnapshot, and incomeSnapshot on create", () => {
  const shift = createShift({
    localDate: "2026-08-21",
    restaurantId: "rst_1",
    restaurantName: "Bluebird",
    hours: 6.5,
    cashTipsCents: 8500,
    cardTipsCents: 12200,
    paySnapshot: { payType: "hourly", payAmountCents: 1500 },
    tipOutSnapshot: { type: "none", amountCents: 0 },
    now: "2026-08-21T20:00:00.000Z",
    id: "sft_1",
  })
  expect(shift.id).toBe("sft_1")
  expect(shift.restaurantName).toBe("Bluebird")
  expect(shift.paySnapshot).toEqual({ payType: "hourly", payAmountCents: 1500 })
  expect(shift.incomeSnapshot.netIncomeCents).toBe(30450)
  expect(shift.incomeSnapshot.tipOutCents).toBe(shift.tipOutSnapshot.amountCents)
})

it("uses a UUID when id is omitted", () => {
  const shift = createShift({
    localDate: "2026-08-21",
    restaurantId: "rst_1",
    restaurantName: "Bluebird",
    hours: 1,
    paySnapshot: { payType: "none", payAmountCents: 0 },
    tipOutSnapshot: { type: "none", amountCents: 0 },
  })
  expect(shift.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )
})
```

Hourly 6.5h × $15.00 = 9750 wage + 20700 tips = 30450 net with no tip-out.

- [ ] **Step 2: Run shift tests; they should fail**

Run: `cd tip-calendar-rn && npm test -- src/domain/shift.test.ts`

Expected: FAIL on `.rule` / missing `restaurantName` / timestamp id

- [ ] **Step 3: Replace shift domain types and calculation**

In `shift.ts` replace `TipOutSnapshot`, `Shift`, and related functions with:

```ts
export type TipOutSnapshot =
  | { type: "none"; amountCents: 0 }
  | { type: "fixed"; amountCents: Cents }
  | { type: "sales_percent"; baseAmountCents: Cents; percent: number; amountCents: Cents }
  | { type: "tips_percent"; baseAmountCents: Cents; percent: number; amountCents: Cents }
  | { type: "manual"; amountCents: Cents }

export type PaySnapshot = {
  payType: PayType
  payAmountCents: Cents
}

export type IncomeSnapshot = {
  totalTipsCents: Cents
  wageIncomeCents: Cents
  otherIncomeCents: Cents
  grossIncomeCents: Cents
  tipOutCents: Cents
  netIncomeCents: Cents
  effectiveHours: number
  effectiveHourlyCents: Cents | null
}

export type Shift = {
  id: string
  localDate: string
  restaurantId: string
  restaurantName: string
  hours: number
  unpaidBreakHours: number
  clockIn?: string
  clockOut?: string
  overnight: boolean
  cashTipsCents: Cents
  cardTipsCents: Cents
  otherIncomeCents: Cents
  salesCents?: Cents
  tipOutSnapshot: TipOutSnapshot
  paySnapshot: PaySnapshot
  incomeSnapshot: IncomeSnapshot
  note?: string
  tag?: ShiftTag
  createdAt: string
  updatedAt: string
}

export type ManualTipOut = { type: "manual"; amountCents: Cents }

export function tipOutRuleFromSnapshot(
  snapshot: TipOutSnapshot,
): TipOutRule | ManualTipOut {
  if (snapshot.type === "sales_percent" || snapshot.type === "tips_percent") {
    return { type: snapshot.type, percent: snapshot.percent }
  }
  if (snapshot.type === "fixed") {
    return { type: "fixed", amountCents: snapshot.amountCents }
  }
  if (snapshot.type === "manual") {
    return { type: "manual", amountCents: snapshot.amountCents }
  }
  return { type: "none" }
}

export function createShift(input: {
  localDate: string
  restaurantId: string
  restaurantName: string
  hours: number
  unpaidBreakHours?: number
  overnight?: boolean
  cashTipsCents?: Cents
  cardTipsCents?: Cents
  otherIncomeCents?: Cents
  salesCents?: Cents
  tipOutSnapshot: TipOutSnapshot
  paySnapshot: PaySnapshot
  incomeSnapshot?: IncomeSnapshot
  note?: string
  tag?: ShiftTag
  clockIn?: string
  clockOut?: string
  now?: string
  id?: string
}): Shift {
  parseLocalDate(input.localDate)
  if (!Number.isFinite(input.hours) || input.hours < 0) {
    throw new Error("Hours must be a finite number")
  }
  const now = input.now ?? new Date().toISOString()
  const cashTipsCents = input.cashTipsCents ?? 0
  const cardTipsCents = input.cardTipsCents ?? 0
  const otherIncomeCents = input.otherIncomeCents ?? 0
  const unpaidBreakHours = input.unpaidBreakHours ?? 0
  const overnight = input.overnight ?? false
  const incomeSnapshot =
    input.incomeSnapshot ??
    incomeSnapshotFromParts({
      paySnapshot: input.paySnapshot,
      tipOutSnapshot: input.tipOutSnapshot,
      hours: input.hours,
      unpaidBreakHours,
      cashTipsCents,
      cardTipsCents,
      otherIncomeCents,
      salesCents: input.salesCents,
    })
  return {
    id: input.id ?? crypto.randomUUID(),
    localDate: input.localDate,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    hours: input.hours,
    unpaidBreakHours,
    clockIn: input.clockIn,
    clockOut: input.clockOut,
    overnight,
    cashTipsCents,
    cardTipsCents,
    otherIncomeCents,
    salesCents: input.salesCents,
    tipOutSnapshot: input.tipOutSnapshot,
    paySnapshot: input.paySnapshot,
    incomeSnapshot,
    note: input.note,
    tag: input.tag,
    createdAt: now,
    updatedAt: now,
  }
}
```

Add `incomeSnapshotFromParts` in the same file: build a synthetic `Restaurant` from `paySnapshot` (`name: "snapshot"`, `id: "snapshot"`, `defaultTipOutRule: { type: "none" }`, timestamps `now`) and call `calculateShiftIncome` with `tipOutOverride: tipOutRuleFromSnapshot(tipOutSnapshot)`. Use the returned `ShiftIncome` fields as `incomeSnapshot` (omit nested snapshot).

Replace `calculateTipOutCents` snapshot returns:

- `manual` → `{ type: "manual", amountCents }`
- `none` → `{ type: "none", amountCents: 0 }`
- `fixed` → `{ type: "fixed", amountCents }`
- `sales_percent` → `{ type: "sales_percent", baseAmountCents: salesCents, percent: rule.percent, amountCents }`
- `tips_percent` → `{ type: "tips_percent", baseAmountCents: totalTipsCents, percent: rule.percent, amountCents }`

`ShiftIncome.tipOutSnapshot` stays `TipOutSnapshot` (flattened).

- [ ] **Step 4: Point readers at frozen income**

Replace `shiftIncome.ts`:

```ts
import type { Restaurant } from "../../domain/restaurant"
import type { Shift, ShiftIncome } from "../../domain/shift"
import type { Cents } from "../../domain/money"

export function displayRestaurantName(shift: Shift, restaurants: Restaurant[]): string {
  return restaurants.find((item) => item.id === shift.restaurantId)?.name ?? shift.restaurantName
}

export function incomeForShift(shift: Shift): ShiftIncome {
  return {
    ...shift.incomeSnapshot,
    tipOutSnapshot: shift.tipOutSnapshot,
  }
}

export function netIncomeCentsForShift(shift: Shift): Cents {
  return shift.incomeSnapshot.netIncomeCents
}
```

`calendarSummary.ts`: `netIncomeCentsForShift(shift)` — drop the restaurants argument from the inner helper. Keep `restaurants` on `summarizeCalendar` input so callers do not churn; just stop using it for net.

`statsSummary.ts`:

```ts
const net = netIncomeCentsForShift(shift)
const tips = shift.incomeSnapshot.totalTipsCents
const hours = shift.incomeSnapshot.effectiveHours
```

Do not look up restaurant to compute net or tips. Restaurant filter by `restaurantId` stays.

`calculationBreakdown.ts`: replace `income.tipOutSnapshot.rule` with `income.tipOutSnapshot`. Use `.type` / `.percent` on the flattened snapshot. For `manual`, label `Tip-out (manual)` and basis `"Manual amount"`.

- [ ] **Step 5: Write snapshots in `toShift`**

`toShift(draft, restaurant, now, existing?)`:

- `restaurantName` = `restaurant?.name ?? existing?.restaurantName ?? "Unknown restaurant"`
- `restaurantId` = `restaurant?.id ?? existing?.restaurantId ?? draft.restaurantId`
- `paySnapshot` from `restaurantForDraft` if restaurant exists, else from draft fields / existing paySnapshot
- `tipOutSnapshot` = `previewShiftIncome(...).tipOutSnapshot` (needs a restaurant object)

When restaurant is missing, build a synthetic restaurant from `existing.paySnapshot` + `existing.restaurantName` so preview still works:

```ts
export function toShift(
  draft: ShiftDraft,
  restaurant: Restaurant | undefined,
  now: string,
  existing?: Shift,
): Shift {
  const effectiveRestaurant =
    restaurant ??
    (existing
      ? {
          id: existing.restaurantId,
          name: existing.restaurantName,
          payType: draft.payType ?? existing.paySnapshot.payType,
          payAmountCents: draft.payAmountCents ?? existing.paySnapshot.payAmountCents,
          creditCardTipPayout: "same_day" as const,
          defaultTipOutRule: { type: "none" as const },
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        }
      : undefined)
  if (!effectiveRestaurant) {
    throw new Error("Restaurant is required to save a new shift")
  }
  const { hours, overnight } = resolveShiftHours(draft)
  const income = previewShiftIncome(draft, effectiveRestaurant)
  return createShift({
    localDate: draft.localDate,
    restaurantId: effectiveRestaurant.id,
    restaurantName: restaurant?.name ?? existing?.restaurantName ?? effectiveRestaurant.name,
    hours,
    unpaidBreakHours: draft.unpaidBreakHours ?? 0,
    overnight,
    clockIn: draft.useClock ? draft.clockIn : undefined,
    clockOut: draft.useClock ? draft.clockOut : undefined,
    cashTipsCents: draft.cashTipsCents,
    cardTipsCents: draft.cardTipsCents,
    otherIncomeCents: draft.otherIncomeCents ?? 0,
    salesCents: draft.salesCents,
    tipOutSnapshot: income.tipOutSnapshot,
    paySnapshot: {
      payType: effectiveRestaurant.payType,
      payAmountCents: effectiveRestaurant.payAmountCents,
    },
    incomeSnapshot: {
      totalTipsCents: income.totalTipsCents,
      wageIncomeCents: income.wageIncomeCents,
      otherIncomeCents: income.otherIncomeCents,
      grossIncomeCents: income.grossIncomeCents,
      tipOutCents: income.tipOutCents,
      netIncomeCents: income.netIncomeCents,
      effectiveHours: income.effectiveHours,
      effectiveHourlyCents: income.effectiveHourlyCents,
    },
    note: draft.note?.trim() ? draft.note.trim() : undefined,
    tag: draft.tag,
    now,
  })
}
```

`fromShift`: `tipOutRule: tipOutRuleFromSnapshot(shift.tipOutSnapshot)` and required `paySnapshot` (no `?.`).

`toUpdatedShift`: pass `existing` into `toShift`, then restore `id` and `createdAt`.

Update `shiftDraft.test.ts`:

```ts
expect(shift.tipOutSnapshot).toEqual({
  type: "tips_percent",
  baseAmountCents: 20700,
  percent: 3,
  amountCents: 621,
})
expect(shift.restaurantName).toBe("Bluebird")
expect(shift.incomeSnapshot.netIncomeCents).toBe(29829)
```

Add a test: `toShift` with `restaurant` undefined and an `existing` shift keeps `restaurantId` / `restaurantName`.

- [ ] **Step 6: Fix every Shift literal / `createShift` call**

Shared extra fields for tests that used `{ rule: { type: "none" }, amountCents: 0 }`:

```ts
restaurantName: restaurant.name,
paySnapshot: { payType: "none", payAmountCents: 0 },
tipOutSnapshot: { type: "none", amountCents: 0 },
```

Files: `calendar.test.ts` (inline Shift — add `restaurantName`, `paySnapshot`, `incomeSnapshot` with `netIncomeCents` equal to the old `cashTipsCents` used as net, `tipOutSnapshot: { type: "none", amountCents: 0 }`), `calendarSummary.test.ts`, `statsSummary.test.ts`, `backup.test.ts`.

For `calendar.test.ts` `incomeSnapshot`, set:

```ts
incomeSnapshot: {
  totalTipsCents: netIncomeCents,
  wageIncomeCents: 0,
  otherIncomeCents: 0,
  grossIncomeCents: netIncomeCents,
  tipOutCents: 0,
  netIncomeCents,
  effectiveHours: 5,
  effectiveHourlyCents: Math.round(netIncomeCents / 5),
}
```

`backup.ts` CSV:

```ts
const name = displayRestaurantName(shift, restaurants)
const income = incomeForShift(shift)
```

Use `income.tipOutCents`, `income.wageIncomeCents`, `income.netIncomeCents`. Never fall back to `0` when the restaurant is missing.

- [ ] **Step 7: Run shift, calendar, stats, draft, backup tests**

Run: `cd tip-calendar-rn && npm test -- src/domain/shift.test.ts src/domain/calendar.test.ts src/features/shift/shiftDraft.test.ts src/features/shift/calculationBreakdown.test.ts src/features/calendar/calendarSummary.test.ts src/features/stats/statsSummary.test.ts src/features/backup/backup.test.ts`

Expected: PASS

Add one stats test (in `statsSummary.test.ts`) that net stays when restaurants is `[]`:

```ts
it("uses frozen income when the restaurant is gone", () => {
  const recorded = shift("2026-08-21", 20700, 6.5)
  const summary = summarizeStats({
    shifts: [recorded],
    restaurants: [],
    mode: "week",
    weekStart: "2026-08-16",
    year: 2026,
    month: 8,
    weekStartsOn: 0,
  })
  expect(summary.netIncomeCents).toBe(20700)
})
```

- [ ] **Step 8: Commit**

```bash
git add tip-calendar-rn/src/domain/shift.ts tip-calendar-rn/src/domain/shift.test.ts tip-calendar-rn/src/domain/calendar.test.ts tip-calendar-rn/src/features/shift/shiftIncome.ts tip-calendar-rn/src/features/shift/shiftDraft.ts tip-calendar-rn/src/features/shift/shiftDraft.test.ts tip-calendar-rn/src/features/shift/calculationBreakdown.ts tip-calendar-rn/src/features/calendar/calendarSummary.ts tip-calendar-rn/src/features/calendar/calendarSummary.test.ts tip-calendar-rn/src/features/stats/statsSummary.ts tip-calendar-rn/src/features/stats/statsSummary.test.ts tip-calendar-rn/src/features/backup/backup.ts tip-calendar-rn/src/features/backup/backup.test.ts
git commit -m "$(cat <<'EOF'
feat: freeze shift pay, tip-out, and net income snapshots

Historical calendar and stats totals no longer recompute from the current restaurant template.
EOF
)"
```

---

### Task 3: migrate v1 documents to schemaVersion 2

**Files:**

- Create: `tip-calendar-rn/src/storage/migrate.ts`
- Create: `tip-calendar-rn/src/storage/migrate.test.ts`
- Modify: `tip-calendar-rn/src/storage/types.ts`
- Modify: `tip-calendar-rn/src/storage/localStore.ts`
- Modify: `tip-calendar-rn/src/storage/localStore.test.ts`
- Modify: `tip-calendar-rn/src/features/backup/backup.ts`
- Modify: `tip-calendar-rn/src/features/backup/backup.test.ts`

- [ ] **Step 1: Write migration tests first**

`migrate.test.ts`:

```ts
import { createRestaurant } from "../domain/restaurant"
import { migrateToV2, parsePersistedState } from "./migrate"
import { emptyState } from "./types"

const restaurant = {
  id: "rst_1",
  name: "Bluebird",
  isDefault: true,
  payType: "hourly" as const,
  payAmountCents: 1500,
  creditCardTipPayout: "same_day" as const,
  defaultTipOutRule: { type: "tips_percent" as const, percent: 3 },
  createdAt: "2026-08-21T20:00:00.000Z",
  updatedAt: "2026-08-21T20:00:00.000Z",
}

const v1Shift = {
  id: "sft_1",
  localDate: "2026-08-21",
  restaurantId: "rst_1",
  hours: 6.5,
  unpaidBreakHours: 0,
  overnight: false,
  cashTipsCents: 8500,
  cardTipsCents: 12200,
  otherIncomeCents: 0,
  tipOutSnapshot: { rule: { type: "tips_percent", percent: 3 }, amountCents: 621 },
  paySnapshot: { payType: "hourly", payAmountCents: 1500 },
  createdAt: "2026-08-21T20:00:00.000Z",
  updatedAt: "2026-08-21T20:00:00.000Z",
}

const v1 = {
  version: 1 as const,
  restaurants: [restaurant],
  shifts: [v1Shift],
  preferences: { weekStartsOn: 0 as const, currencySymbol: "$", timeFormat: "12h" as const },
}

describe("migrateToV2", () => {
  it("moves default restaurant into preferences and freezes snapshots", () => {
    const next = migrateToV2(v1, "load")
    expect(next.schemaVersion).toBe(2)
    expect("version" in next).toBe(false)
    expect("isDefault" in next.restaurants[0]!).toBe(false)
    expect(next.preferences.defaultRestaurantId).toBe("rst_1")
    expect(next.shifts[0]?.id).toBe("sft_1")
    expect(next.shifts[0]?.restaurantName).toBe("Bluebird")
    expect(next.shifts[0]?.tipOutSnapshot).toEqual({
      type: "tips_percent",
      baseAmountCents: 20700,
      percent: 3,
      amountCents: 621,
    })
    expect(next.shifts[0]?.incomeSnapshot.netIncomeCents).toBe(29829)
    expect(next.shifts[0]?.incomeSnapshot.tipOutCents).toBe(621)
  })

  it("keeps a missing-restaurant shift and names it Unknown restaurant", () => {
    const next = migrateToV2({ ...v1, restaurants: [] }, "load")
    expect(next.shifts[0]?.restaurantName).toBe("Unknown restaurant")
    expect(next.shifts[0]?.incomeSnapshot.netIncomeCents).toBeGreaterThan(0)
    expect(next.preferences.defaultRestaurantId).toBeNull()
  })

  it("drops shifts without id or localDate on load", () => {
    const next = migrateToV2(
      { ...v1, shifts: [{ cashTipsCents: 1 }, v1Shift] },
      "load",
    )
    expect(next.shifts).toHaveLength(1)
    expect(next.shifts[0]?.id).toBe("sft_1")
  })

  it("rejects import when any shift lacks id or localDate", () => {
    expect(() =>
      migrateToV2({ ...v1, shifts: [{ cashTipsCents: 1 }, v1Shift] }, "import"),
    ).toThrow("This file is not a Tips Calendar backup.")
  })
})

describe("parsePersistedState", () => {
  it("returns v2 documents unchanged", () => {
    const v2 = migrateToV2(v1, "load")
    expect(parsePersistedState(v2, "load")).toEqual(v2)
  })

  it("returns empty on unreadable load payloads", () => {
    expect(parsePersistedState({ hello: true }, "load")).toEqual(emptyState)
    expect(parsePersistedState(null, "load")).toEqual(emptyState)
  })

  it("throws on unreadable import payloads", () => {
    expect(() => parsePersistedState({ hello: true }, "import")).toThrow(
      "This file is not a Tips Calendar backup.",
    )
  })
})
```

Also assert v1 manual-as-fixed stays `fixed`: a shift whose `tipOutSnapshot.rule` is `{ type: "fixed", amountCents: 250 }` migrates to `{ type: "fixed", amountCents: 250 }`, not `manual`.

- [ ] **Step 2: Run migration tests; they should fail**

Run: `cd tip-calendar-rn && npm test -- src/storage/migrate.test.ts`

Expected: FAIL (module missing)

- [ ] **Step 3: Implement `migrate.ts` and bump `AppState`**

`types.ts`:

```ts
export type AppState = {
  schemaVersion: 2
  restaurants: Restaurant[]
  shifts: Shift[]
  preferences: Preferences
}

export const emptyState: AppState = {
  schemaVersion: 2,
  restaurants: [],
  shifts: [],
  preferences: defaultPreferences,
}
```

Remove `version: 1`.

`migrate.ts` responsibilities:

1. `parsePersistedState(value, mode)`:
   - object with `schemaVersion === 2` and restaurant/shift arrays → return as `AppState` (fill missing preferences from `emptyState.preferences`). Do not recompute `incomeSnapshot`.
   - object with `version === 1` and no `schemaVersion` → `migrateToV2`.
   - else: `load` → `emptyState`; `import` → throw `"This file is not a Tips Calendar backup."`
2. `migrateToV2(v1, mode)`:
   - `defaultRestaurantId` = id of `isDefault: true`, else `restaurants[0]?.id ?? null`
   - strip `isDefault` from restaurants (keep other fields)
   - for each shift: if missing `id` or `localDate`, skip on `load`, throw on `import`
   - `restaurantName` from matching restaurant or `"Unknown restaurant"`
   - `paySnapshot` from shift or restaurant or `{ payType: "none", payAmountCents: 0 }`
   - flatten v1 `{ rule, salesCents?, amountCents }` using `rule`; `tips_percent` base = cash+card; `sales_percent` base = `salesCents ?? shift.salesCents ?? 0`; v1 `fixed` stays `fixed`; v1 `none` stays none
   - `incomeSnapshot` via `calculateShiftIncome` using a restaurant built from `paySnapshot` + v1 `rule` as `tipOutOverride` (not the flattened snapshot)
   - keep original `id`

Helper for v1 rule: if `rule.type === "fixed"` pass that rule; if percent types pass them; if none pass none. Do not invent `manual`.

- [ ] **Step 4: Load and import go through parsePersistedState**

`localStore.ts` `load`:

```ts
async load(): Promise<AppState> {
  const raw = await kv.getItem(STORAGE_KEY)
  if (!raw) {
    return emptyState
  }
  try {
    const next = parsePersistedState(JSON.parse(raw), "load")
    if (next.schemaVersion === 2) {
      await kv.setItem(STORAGE_KEY, JSON.stringify(next))
    }
    return next
  } catch {
    return emptyState
  }
}
```

Always writing after a successful parse is fine: v1 becomes v2 on disk; v2 is rewritten unchanged.

`backup.ts` `parseBackupJson`:

```ts
export function parseBackupJson(raw: string): AppState {
  try {
    return parsePersistedState(JSON.parse(raw), "import")
  } catch (error) {
    if (error instanceof Error && error.message === "This file is not a Tips Calendar backup.") {
      throw error
    }
    throw new Error("This file is not a Tips Calendar backup.")
  }
}
```

`exportJson` already stringifies `AppState`; after the type bump it will contain `schemaVersion: 2`.

Update `localStore.test.ts`: empty state `schemaVersion: 2`; add a test that loading a v1 JSON string returns v2 with frozen net income.

Update `backup.test.ts`: round-trip expects `schemaVersion: 2`; add import of a v1 JSON string; add rejection of a v1 file with a shift missing `id`.

- [ ] **Step 5: Run storage and backup tests**

Run: `cd tip-calendar-rn && npm test -- src/storage/migrate.test.ts src/storage/localStore.test.ts src/features/backup/backup.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tip-calendar-rn/src/storage/migrate.ts tip-calendar-rn/src/storage/migrate.test.ts tip-calendar-rn/src/storage/types.ts tip-calendar-rn/src/storage/localStore.ts tip-calendar-rn/src/storage/localStore.test.ts tip-calendar-rn/src/features/backup/backup.ts tip-calendar-rn/src/features/backup/backup.test.ts
git commit -m "$(cat <<'EOF'
feat: migrate local backups to schemaVersion 2

Existing v1 AsyncStorage and JSON files keep shift ids and freeze historical income on load.
EOF
)"
```

---

### Task 4: Day Details and edit still work after restaurant delete

**Files:**

- Modify: `tip-calendar-rn/src/features/calendar/DayDetailsSheet.tsx`
- Modify: `tip-calendar-rn/src/app/shift/[id].tsx`
- Modify: `tip-calendar-rn/src/features/backup/backup.test.ts` (deleted-restaurant CSV name)

- [ ] **Step 1: Add a CSV test for deleted restaurant name**

In `backup.test.ts`:

```ts
it("uses the frozen restaurant name when the restaurant row is gone", () => {
  const csv = exportCsv({ ...state, restaurants: [] })
  expect(csv).toContain('"Bluebird, NYC"')
  expect(csv).toContain("207.00")
})
```

- [ ] **Step 2: Run it; should fail if backup still writes an empty name**

Run: `cd tip-calendar-rn && npm test -- src/features/backup/backup.test.ts`

If Task 2 already uses `displayRestaurantName`, this PASS. If it fails, fix `rowForShift` before continuing.

- [ ] **Step 3: Day Details reads snapshots**

Remove local `restaurantForShift` / `incomeForShift` / `calculateShiftIncome` usage.

```ts
import { displayRestaurantName, incomeForShift } from "@/features/shift/shiftIncome"

const cards = shifts.map((shift) => ({
  shift,
  restaurantName: displayRestaurantName(shift, restaurants),
  income: incomeForShift(shift),
}))
const dailyTotal = cards.reduce((sum, card) => sum + card.income.netIncomeCents, 0)
```

Wage label uses `shift.paySnapshot`, not a synthetic restaurant:

```ts
function wageLabel(shift: Shift): string {
  if (shift.paySnapshot.payType === "hourly" && shift.paySnapshot.payAmountCents > 0) {
    return `Hourly wages (${formatHours(shift.hours)} hrs × ${formatUsd(shift.paySnapshot.payAmountCents)}/hr)`
  }
  return "Wages"
}
```

Template: `{restaurantName}` instead of `{restaurant.name}`.

- [ ] **Step 4: Allow editing a shift whose restaurant was deleted**

`app/shift/[id].tsx` currently redirects when `!restaurant`. Change to:

- If `!shift`, redirect home.
- `liveRestaurant` = find by `restaurantId` or by selected `restaurantId`.
- Pass `restaurant={liveRestaurant ?? restaurantFromShift(shift)}` into the form for field defaults.
- Pass `restaurants={state.restaurants}` (live list only).
- `onSave`: `toUpdatedShift(draft, liveRestaurant, shift, now)` so a missing live restaurant keeps frozen id/name.

Add `restaurantFromShift` in `shiftDraft.ts`:

```ts
export function restaurantFromShift(shift: Shift): Restaurant {
  return {
    id: shift.restaurantId,
    name: shift.restaurantName,
    payType: shift.paySnapshot.payType,
    payAmountCents: shift.paySnapshot.payAmountCents,
    creditCardTipPayout: "same_day",
    defaultTipOutRule: { type: "none" },
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  }
}
```

If `RecordShiftForm` hides the picker when `restaurants.length > 1` is false, a user with zero live restaurants can still save the orphaned shift via `toUpdatedShift`.

When the user picks another live restaurant, `onRestaurantChange` sets `restaurantId`; save uses that live restaurant, which copies the new name and rewrites snapshots.

- [ ] **Step 5: Run the full RN unit suite**

Run: `cd tip-calendar-rn && npm test`

Expected: PASS (all existing tests plus new ones)

- [ ] **Step 6: Commit**

```bash
git add tip-calendar-rn/src/features/calendar/DayDetailsSheet.tsx tip-calendar-rn/src/app/shift/[id].tsx tip-calendar-rn/src/features/shift/shiftDraft.ts tip-calendar-rn/src/features/backup/backup.test.ts
git commit -m "$(cat <<'EOF'
fix: show frozen shift income and name after a restaurant is deleted

Day details and CSV keep historical net income; editing an orphaned shift does not redirect away.
EOF
)"
```

---

## Acceptance mapping

| Spec requirement | Task |
|---|---|
| Stable UUID ids; keep old ids | 1, 2, 3 |
| Flattened tip-out snapshot with base/rate/amount | 2, 3 |
| `paySnapshot` required; `incomeSnapshot` frozen | 2 |
| `localDate` unchanged | 2 (no rename) |
| Restaurant template vs shift fact | 1, 2 |
| `schemaVersion: 2` + v1 migration | 3 |
| UI state not in JSON | already true; export is `AppState` only |
| Hard-delete restaurant; freeze name | 1, 2, 4 |
| Calendar/Stats/CSV read snapshots | 2, 4 |
| Cents, not dollars | unchanged |
| No H5, no sync fields, same storage key | all tasks |

---

## Notes for the implementer

- Work only under `tip-calendar-rn/`.
- After Task 2, TypeScript may still fail in `DayDetailsSheet.tsx` until Task 4 if that file still references `tipOutSnapshot.rule` or `isDefault`. If `npm test` typechecks the whole project, finish the Day Details compile fixes in Task 2 rather than leaving a red tree. Prefer moving the Day Details snapshot read into Task 2 Step 6 if tests will not run otherwise.
- Do not add `deletedAt`, `userId`, or `syncStatus`.
- Do not rewrite existing `sft_…` / `rst_…` ids during migration.
