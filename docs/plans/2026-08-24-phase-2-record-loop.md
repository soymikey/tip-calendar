# Phase 2: Record Shift Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tap a calendar date, record hours and tips on a short form with live net income, save, and see a green amount on that day after relaunch.

**Architecture:** Reuse `calculateShiftIncome` and `createLocalStore`. A stack route `/shift/new?date=YYYY-MM-DD` sits beside tabs (same pattern as Onboarding). Default restaurant is `isDefault` or the first restaurant. Calendar cells and This Week / This Month / Hourly cards read computed net income, never stored totals. Dates with shifts still open the add form this phase; Day Details is Phase 3.

**Tech Stack:** Expo Router Stack, NativeWind, existing domain/storage/tokens from Phase 0–1.

**Depends on:** Phase 1 on `master`.

**Figma (file `ifAdYyy4qP0UXjbj7AX7Jx`):**

| 画板 | node | 行为 |
|---|---|---|
| `record-shift-form` | `3:208` | Cancel、只读日期、Hours / Cash / Card、Results、Save Shift |
| `calendar-home` | `3:7` | 绿色日金额、三张汇总卡有数字 |

主色继续用 `#0066CC`，收入绿用 token `#1F7A4D`，不要改成 Figma 的 `#007AFF` / `#008A3B`。不要画系统状态栏。表单不要再画一套 Tab bar。

**本阶段不对齐：** Day Details、编辑/删除、`+ More Options`、Clock in/out、`? How is this calculated?`、校验错误页、`record-shift-no-restaurant`。餐厅已有 pay / tip-out 时，结果区自动带入，不必做 `+ Base Pay` / `+ Tip-out` 展开。

---

## File map

Create:

- `tip-calendar-rn/src/domain/shift.ts` — add `createShift` (file already exists)
- `tip-calendar-rn/src/features/shift/shiftDraft.ts`
- `tip-calendar-rn/src/features/shift/shiftDraft.test.ts`
- `tip-calendar-rn/src/features/calendar/calendarSummary.ts`
- `tip-calendar-rn/src/features/calendar/calendarSummary.test.ts`
- `tip-calendar-rn/src/features/shift/RecordShiftForm.tsx`
- `tip-calendar-rn/src/app/shift/new.tsx`

Modify:

- `tip-calendar-rn/src/domain/shift.test.ts` — `createShift` tests
- `tip-calendar-rn/src/app/_layout.tsx` — register `shift/new`
- `tip-calendar-rn/src/features/calendar/CalendarMonth.tsx` — green amounts
- `tip-calendar-rn/src/app/(tabs)/index.tsx` — navigate, summaries, hide overlay when any shift exists
- `docs/plans/README.md` — 阶段 2 状态

---

### Task 1: `createShift` factory

**Files:**
- Modify: `tip-calendar-rn/src/domain/shift.ts`
- Modify: `tip-calendar-rn/src/domain/shift.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `shift.test.ts`:

```ts
import { createRestaurant } from "./restaurant"
import { calculateHoursFromClock, calculateShiftIncome, createShift } from "./shift"

describe("createShift", () => {
  it("stores a local date and money in cents", () => {
    const shift = createShift({
      localDate: "2026-08-21",
      restaurantId: "rst_1",
      hours: 6.5,
      cashTipsCents: 8500,
      cardTipsCents: 12200,
      tipOutSnapshot: { rule: { type: "none" }, amountCents: 0 },
      now: "2026-08-21T20:00:00.000Z",
    })
    expect(shift.id).toBe("sft_2026-08-21T20:00:00.000Z")
    expect(shift.localDate).toBe("2026-08-21")
    expect(shift.unpaidBreakHours).toBe(0)
    expect(shift.overnight).toBe(false)
    expect(shift.otherIncomeCents).toBe(0)
  })

  it("rejects a non-local date", () => {
    expect(() =>
      createShift({
        localDate: "2026/08/21",
        restaurantId: "rst_1",
        hours: 1,
        tipOutSnapshot: { rule: { type: "none" }, amountCents: 0 },
      }),
    ).toThrow("Date must use YYYY-MM-DD")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd tip-calendar-rn && npm test -- src/domain/shift.test.ts
```

Expected: FAIL because `createShift` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `shift.ts` (reuse `parseLocalDate` from `./calendar`):

```ts
import { parseLocalDate } from "./calendar"

export function createShift(input: {
  localDate: string
  restaurantId: string
  hours: number
  unpaidBreakHours?: number
  overnight?: boolean
  cashTipsCents?: Cents
  cardTipsCents?: Cents
  otherIncomeCents?: Cents
  salesCents?: Cents
  tipOutSnapshot: TipOutSnapshot
  note?: string
  now?: string
  id?: string
}): Shift {
  parseLocalDate(input.localDate)
  if (!Number.isFinite(input.hours) || input.hours < 0) {
    throw new Error("Hours must be a finite number")
  }
  const now = input.now ?? new Date().toISOString()
  return {
    id: input.id ?? `sft_${now}`,
    localDate: input.localDate,
    restaurantId: input.restaurantId,
    hours: input.hours,
    unpaidBreakHours: input.unpaidBreakHours ?? 0,
    overnight: input.overnight ?? false,
    cashTipsCents: input.cashTipsCents ?? 0,
    cardTipsCents: input.cardTipsCents ?? 0,
    otherIncomeCents: input.otherIncomeCents ?? 0,
    salesCents: input.salesCents,
    tipOutSnapshot: input.tipOutSnapshot,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/domain/shift.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/domain/shift.ts tip-calendar-rn/src/domain/shift.test.ts
git commit -m "$(cat <<'EOF'
feat: add createShift factory for persisted shifts

EOF
)"
```

---

### Task 2: Shift draft preview and save payload

**Files:**
- Create: `tip-calendar-rn/src/features/shift/shiftDraft.ts`
- Create: `tip-calendar-rn/src/features/shift/shiftDraft.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { createRestaurant } from "../../domain/restaurant"
import { canSaveShift, previewShiftIncome, toShift } from "./shiftDraft"

const restaurant = createRestaurant({
  name: "Bluebird",
  payType: "hourly",
  payAmountCents: 1500,
  defaultTipOutRule: { type: "tips_percent", percent: 3 },
  now: "2026-08-21T20:00:00.000Z",
})

const draft = {
  localDate: "2026-08-21",
  restaurantId: restaurant.id,
  hours: 6.5,
  cashTipsCents: 8500,
  cardTipsCents: 12200,
}

describe("shiftDraft", () => {
  it("blocks save until hours are greater than 0", () => {
    expect(canSaveShift({ ...draft, hours: 0 })).toBe(false)
    expect(canSaveShift(draft)).toBe(true)
  })

  it("previews net income from the restaurant pay and tip-out rules", () => {
    const income = previewShiftIncome(draft, restaurant)
    expect(income.totalTipsCents).toBe(20700)
    expect(income.wageIncomeCents).toBe(9750)
    expect(income.tipOutCents).toBe(621)
    expect(income.netIncomeCents).toBe(29829)
  })

  it("builds a shift with a tip-out snapshot", () => {
    const shift = toShift(draft, restaurant, "2026-08-21T20:00:00.000Z")
    expect(shift.localDate).toBe("2026-08-21")
    expect(shift.hours).toBe(6.5)
    expect(shift.tipOutSnapshot.amountCents).toBe(621)
    expect(shift.tipOutSnapshot.rule).toEqual({ type: "tips_percent", percent: 3 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/features/shift/shiftDraft.test.ts
```

Expected: FAIL because the module is missing.

- [ ] **Step 3: Write implementation**

```ts
import { createShift, calculateShiftIncome, type Shift, type ShiftIncome } from "../../domain/shift"
import type { Restaurant } from "../../domain/restaurant"

export type ShiftDraft = {
  localDate: string
  restaurantId: string
  hours: number
  cashTipsCents: number
  cardTipsCents: number
}

export function canSaveShift(draft: ShiftDraft): boolean {
  return draft.hours > 0
}

export function previewShiftIncome(draft: ShiftDraft, restaurant: Restaurant): ShiftIncome {
  return calculateShiftIncome({
    restaurant,
    hours: draft.hours,
    cashTipsCents: draft.cashTipsCents,
    cardTipsCents: draft.cardTipsCents,
  })
}

export function toShift(draft: ShiftDraft, restaurant: Restaurant, now: string): Shift {
  const income = previewShiftIncome(draft, restaurant)
  return createShift({
    localDate: draft.localDate,
    restaurantId: restaurant.id,
    hours: draft.hours,
    cashTipsCents: draft.cashTipsCents,
    cardTipsCents: draft.cardTipsCents,
    tipOutSnapshot: income.tipOutSnapshot,
    now,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/features/shift/shiftDraft.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/features/shift
git commit -m "$(cat <<'EOF'
feat: preview and assemble a shift from the default form

EOF
)"
```

---

### Task 3: Calendar day totals and summary cards

**Files:**
- Create: `tip-calendar-rn/src/features/calendar/calendarSummary.ts`
- Create: `tip-calendar-rn/src/features/calendar/calendarSummary.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { createRestaurant } from "../../domain/restaurant"
import { createShift } from "../../domain/shift"
import { summarizeCalendar } from "./calendarSummary"

const restaurant = createRestaurant({
  name: "Bluebird",
  payType: "none",
  now: "2026-08-21T20:00:00.000Z",
})

function shift(localDate: string, cashTipsCents: number, hours = 5) {
  return createShift({
    localDate,
    restaurantId: restaurant.id,
    hours,
    cashTipsCents,
    cardTipsCents: 0,
    tipOutSnapshot: { rule: { type: "none" }, amountCents: 0 },
    now: "2026-08-21T20:00:00.000Z",
    id: `sft_${localDate}_${cashTipsCents}`,
  })
}

describe("summarizeCalendar", () => {
  it("groups net income by local date and fills week, month, hourly", () => {
    const summary = summarizeCalendar({
      shifts: [
        shift("2026-08-16", 10000),
        shift("2026-08-21", 20700, 6.5),
        shift("2026-07-31", 5000),
      ],
      restaurants: [restaurant],
      today: "2026-08-21",
      year: 2026,
      month: 8,
      weekStartsOn: 0,
    })
    expect(summary.byDate.get("2026-08-21")).toBe(20700)
    expect(summary.weekCents).toBe(30700)
    expect(summary.monthCents).toBe(30700)
    expect(summary.hourlyCents).toBe(Math.round(30700 / 11.5))
  })
})
```

Aug 16 2026 is Sunday, Aug 21 is Friday, so both are in the week starting Aug 16. July 31 is previous month.

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/features/calendar/calendarSummary.test.ts
```

Expected: FAIL because the module is missing.

- [ ] **Step 3: Write implementation**

```ts
import { startOfWeek, type LocalDate, type WeekStartsOn } from "../../domain/calendar"
import { calculateShiftIncome, type Shift } from "../../domain/shift"
import type { Restaurant } from "../../domain/restaurant"
import type { Cents } from "../../domain/money"

export type CalendarSummary = {
  byDate: Map<LocalDate, Cents>
  weekCents: Cents
  monthCents: Cents
  hourlyCents: Cents | null
}

function netForShift(shift: Shift, restaurants: Restaurant[]): Cents {
  const restaurant = restaurants.find((item) => item.id === shift.restaurantId)
  if (!restaurant) {
    return 0
  }
  return calculateShiftIncome({
    restaurant,
    hours: shift.hours,
    unpaidBreakHours: shift.unpaidBreakHours,
    cashTipsCents: shift.cashTipsCents,
    cardTipsCents: shift.cardTipsCents,
    otherIncomeCents: shift.otherIncomeCents,
    salesCents: shift.salesCents,
    tipOutOverride: shift.tipOutSnapshot.rule,
  }).netIncomeCents
}

export function summarizeCalendar(input: {
  shifts: Shift[]
  restaurants: Restaurant[]
  today: LocalDate
  year: number
  month: number
  weekStartsOn: WeekStartsOn
}): CalendarSummary {
  const weekStart = startOfWeek(input.today, input.weekStartsOn)
  const monthPrefix = `${input.year}-${String(input.month).padStart(2, "0")}`
  const byDate = new Map<LocalDate, Cents>()
  let weekCents = 0
  let monthCents = 0
  let monthHours = 0

  for (const shift of input.shifts) {
    const net = netForShift(shift, input.restaurants)
    byDate.set(shift.localDate, (byDate.get(shift.localDate) ?? 0) + net)
    if (startOfWeek(shift.localDate, input.weekStartsOn) === weekStart) {
      weekCents += net
    }
    if (shift.localDate.startsWith(monthPrefix)) {
      monthCents += net
      monthHours += Math.max(0, shift.hours - shift.unpaidBreakHours)
    }
  }

  return {
    byDate,
    weekCents,
    monthCents,
    hourlyCents: monthHours > 0 ? Math.round(monthCents / monthHours) : null,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/features/calendar/calendarSummary.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/features/calendar/calendarSummary.ts tip-calendar-rn/src/features/calendar/calendarSummary.test.ts
git commit -m "$(cat <<'EOF'
feat: summarize calendar net income by day, week, and month

EOF
)"
```

---

### Task 4: Record Shift screen

**Files:**
- Create: `tip-calendar-rn/src/features/shift/RecordShiftForm.tsx`
- Create: `tip-calendar-rn/src/app/shift/new.tsx`
- Modify: `tip-calendar-rn/src/app/_layout.tsx`

Layout from `record-shift-form`: white canvas, Cancel `#0066CC` 16 medium left, date 17 semibold center (`Thu, August 21`), fields 20 padding, labels 12 uppercase muted, inputs height 44 radius 8, Results parchment card radius 12 padding 16, Net Income 28 bold `colors.income`, disclaimer 12 muted, Save 50 pill `#0066CC`.

Copy:

- Cancel
- Restaurant (read-only name if only one restaurant)
- Hours worked
- Cash Tips / Card Tips with `$` prefix, decimal pad
- Results / Total Tips / Wages / Tip-out / Net Income / `Net income ≠ cash received this shift` / Actual Hourly (`$42.07/hr` or `—` if hours are 0)
- Save Shift, disabled when `!canSaveShift`

Do not render `+ Base Pay`, `+ Tip-out`, `+ More Options`, calculation link, or a second tab bar.

On save:

```ts
const shift = toShift(draft, restaurant, new Date().toISOString())
await updateState((current) => ({
  ...current,
  shifts: [...current.shifts, shift],
}))
router.back()
```

Date param missing → `router.back()`. No restaurants → `router.back()` (Onboarding already guarantees one).

Wire `Stack.Screen name="shift/new"`.

- [ ] **Step 1: Implement the form and route**

- [ ] **Step 2: Manual path**

1. Open `/shift/new?date=2026-08-21`.
2. Empty hours keeps Save disabled.
3. Type 6.5 / 85 / 122 and confirm Results update before save.
4. Cancel returns to Calendar with no new shift.

- [ ] **Step 3: Commit**

```bash
git add tip-calendar-rn/src/features/shift/RecordShiftForm.tsx tip-calendar-rn/src/app/shift/new.tsx tip-calendar-rn/src/app/_layout.tsx
git commit -m "$(cat <<'EOF'
feat: add default record-shift form with live net income

EOF
)"
```

---

### Task 5: Calendar amounts and date navigation

**Files:**
- Modify: `tip-calendar-rn/src/features/calendar/CalendarMonth.tsx`
- Modify: `tip-calendar-rn/src/app/(tabs)/index.tsx`
- Modify: `docs/plans/README.md`

- [ ] **Step 1: Show compact green amounts**

Pass `amountsByDate?: Map<string, number>` into `CalendarMonth`. Under the day number, if amount exists, render `formatUsd(amount, { compact: true })` at 11 semibold `colors.income`. Selected day: white number, keep green amount (or white amount on blue — match Figma selected empty day; if the selected day has money, white amount is readable). Use white amount when selected.

- [ ] **Step 2: Wire the home screen**

- `useAppState()` + `summarizeCalendar`.
- Overlay only when `state.shifts.length === 0 && showEmptyHint`.
- Cards: formatUsd week/month; Hourly `formatUsd(hourlyCents)/hr` or `—`.
- `onSelectDate`: dismiss overlay, set selected, `router.push({ pathname: "/shift/new", params: { date: localDate } })`.

- [ ] **Step 3: Verify**

1. Tap an empty date → form bound to that local date.
2. Save → calendar shows green compact amount; week/month cards update.
3. Kill and relaunch → amount still there.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all previous tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/features/calendar/CalendarMonth.tsx tip-calendar-rn/src/app/(tabs)/index.tsx docs/plans/README.md
git commit -m "$(cat <<'EOF'
feat: show saved shift amounts on the calendar

EOF
)"
```

---

## Acceptance

- Tapping a date opens Record Shift for that `YYYY-MM-DD`; the date is not editable.
- Hours + cash + card update Total Tips, Wages, Tip-out, Net Income, Actual Hourly before save.
- Save writes through `createLocalStore`; Calendar shows compact green day totals.
- This Week / This Month / Hourly leave `—` until there is data.
- Empty overlay only appears when there are zero shifts.
- Reloading the app keeps the shift.

## Out of this phase

Day Details, edit/delete/undo, More options, calculation sheet, validation screen, no-restaurant intercept, overnight clock fields.
