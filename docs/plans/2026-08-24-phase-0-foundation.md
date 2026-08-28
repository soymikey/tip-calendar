# Phase 0: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `tip-calendar-rn/` from the Expo starter into a Tips Calendar shell: three tabs, design tokens, domain calculations, and a local store that later phases can plug into.

**Architecture:** Keep Expo Router under `src/app/`. Put money, restaurant, shift, and calendar math in `src/domain/` as pure TypeScript with no React Native imports. Persist through `src/storage/` behind a `KeyValueStore` interface so tests use memory and the app uses AsyncStorage. UI this phase is a placeholder shell, not pixel-perfect Figma.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, NativeWind 4 + Tailwind 3, Jest + jest-expo, AsyncStorage, TypeScript.

**Depends on:** none. This is the first phase.

**Figma this phase:** lock the contract, not the screens. Do not implement or pixel-match `calendar-home`, `stats`, or `me`.

| 要对齐 Figma | 不要对齐 Figma |
|---|---|
| 三个 Tab 的名称与顺序：Calendar / Stats / Me | 月历格子、摘要卡、趋势图、Me 四个入口列表 |
| Tab 选中色 `#0066CC`、未选中色灰、白底 | Tab 图标的像素描边、自定义 tab bar 高度 |
| Token：主色、白画布、`#F5F5F7`、金额绿、危险红、20pt 左右边距 | 各页标题字号、行距、圆角的逐屏还原 |
| 文案语言：英文。占位标题用 `Tips Calendar` / `Stats` / `Me` | Record Shift、Onboarding、Day Details 任何一屏 |
| 金额展示口径：卡片 `$1,240.00`，日历格整数可写成 `$142` | `formatUsd` 的测试样例数字不必来自某一张画板 |
| 默认周起始日 Sunday，与空日历 `S M T W T F S` 一致 | 把 `buildMonthGrid` 画成可见日历 UI |

阶段 0 的 Figma 用途是把后面阶段会反复用到的名字、颜色和信息架构定死。屏幕级还原放到该屏幕所属阶段，并用当时的 `get_design_context` 对照。

---

## File map

Create:

- `tip-calendar-rn/jest.config.js`
- `tip-calendar-rn/src/test/setup.ts`
- `tip-calendar-rn/src/theme/colors.ts`
- `tip-calendar-rn/src/theme/tokens.ts`
- `tip-calendar-rn/src/domain/money.ts`
- `tip-calendar-rn/src/domain/money.test.ts`
- `tip-calendar-rn/src/domain/restaurant.ts`
- `tip-calendar-rn/src/domain/restaurant.test.ts`
- `tip-calendar-rn/src/domain/shift.ts`
- `tip-calendar-rn/src/domain/shift.test.ts`
- `tip-calendar-rn/src/domain/calendar.ts`
- `tip-calendar-rn/src/domain/calendar.test.ts`
- `tip-calendar-rn/src/storage/types.ts`
- `tip-calendar-rn/src/storage/memoryStore.ts`
- `tip-calendar-rn/src/storage/localStore.ts`
- `tip-calendar-rn/src/storage/localStore.test.ts`
- `tip-calendar-rn/src/app/(tabs)/_layout.tsx`
- `tip-calendar-rn/src/app/(tabs)/index.tsx`
- `tip-calendar-rn/src/app/(tabs)/stats.tsx`
- `tip-calendar-rn/src/app/(tabs)/me.tsx`
- `tip-calendar-rn/tailwind.config.js`
- `tip-calendar-rn/nativewind-env.d.ts`
- `tip-calendar-rn/metro.config.js`
- `tip-calendar-rn/babel.config.js`

Modify:

- `tip-calendar-rn/package.json` — add test script and dependencies
- `tip-calendar-rn/src/app/_layout.tsx` — Stack that hosts tabs, drop starter splash overlay
- `tip-calendar-rn/src/global.css` — Tailwind directives
- `tip-calendar-rn/app.json` — keep portrait, confirm scheme `tipcalendar`

Delete after tabs work:

- `tip-calendar-rn/src/app/explore.tsx`
- Starter-only usage of `animated-icon`, `hint-row`, `web-badge` from the Calendar tab

Do **not** create shift / restaurant / onboarding screens in this phase.

---

## Shared types this phase locks

Later phases must import these names. Do not rename them.

```ts
export type Cents = number

export type PayType = "hourly" | "fixed" | "none"

export type TipOutRule =
  | { type: "none" }
  | { type: "fixed"; amountCents: Cents }
  | { type: "sales_percent"; percent: number }
  | { type: "tips_percent"; percent: number }

export type CreditCardTipPayout = "same_day" | "paycheck"

export type Restaurant = {
  id: string
  name: string
  isDefault: boolean
  payType: PayType
  payAmountCents: Cents
  creditCardTipPayout: CreditCardTipPayout
  defaultTipOutRule: TipOutRule
  createdAt: string
  updatedAt: string
}

export type ShiftTag = "lunch" | "dinner"

export type TipOutSnapshot = {
  rule: TipOutRule
  salesCents?: Cents
  amountCents: Cents
}

export type Shift = {
  id: string
  localDate: string
  restaurantId: string
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
  note?: string
  tag?: ShiftTag
  createdAt: string
  updatedAt: string
}

export type Preferences = {
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  currencySymbol: string
  timeFormat: "12h" | "24h"
}

export type AppState = {
  version: 1
  restaurants: Restaurant[]
  shifts: Shift[]
  preferences: Preferences
}
```

Money rules:

- Store cents as integers. Never accumulate income in floating dollars.
- `dollarsToCents(1.005)` → `101` (`Math.round(dollars * 100)`).
- Calendar compact amounts may drop `.00`; cards and forms always show two decimals.

Date rules:

- `localDate` is `YYYY-MM-DD` in the user's local calendar.
- Month grids and week ranges are built from that string, not from `Date#toISOString()`.

---

### Task 1: Jest

**Files:**
- Create: `tip-calendar-rn/jest.config.js`
- Create: `tip-calendar-rn/src/test/setup.ts`
- Modify: `tip-calendar-rn/package.json`

- [ ] **Step 1: Install test runner**

From `tip-calendar-rn/`:

```bash
npx expo install jest-expo jest @types/jest --dev
```

Expected: packages added, Expo versions aligned with SDK 57.

- [ ] **Step 2: Add Jest config**

`jest.config.js`:

```js
/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
}
```

`src/test/setup.ts`:

```ts
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)
```

Leave the mock file empty of extra logic; the official mock is enough.

- [ ] **Step 3: Add npm script**

In `package.json` scripts:

```json
"test": "jest"
```

- [ ] **Step 4: Commit**

```bash
git add tip-calendar-rn/package.json tip-calendar-rn/package-lock.json tip-calendar-rn/jest.config.js tip-calendar-rn/src/test/setup.ts
git commit -m "$(cat <<'EOF'
chore: add Jest for domain and storage tests

EOF
)"
```

---

### Task 2: Money helpers

**Files:**
- Create: `tip-calendar-rn/src/domain/money.test.ts`
- Create: `tip-calendar-rn/src/domain/money.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { addCents, centsToDollars, dollarsToCents, formatUsd } from "./money"

describe("dollarsToCents", () => {
  it("rounds half away from zero to the nearest cent", () => {
    expect(dollarsToCents(12.345)).toBe(1235)
    expect(dollarsToCents(12.344)).toBe(1234)
    expect(dollarsToCents(-1.225)).toBe(-123)
  })
})

describe("formatUsd", () => {
  it("formats accounting amounts with two decimals", () => {
    expect(formatUsd(124000)).toBe("$1,240.00")
    expect(formatUsd(284750)).toBe("$2,847.50")
  })

  it("formats compact calendar amounts without trailing .00", () => {
    expect(formatUsd(14200, { compact: true })).toBe("$142")
    expect(formatUsd(27350, { compact: true })).toBe("$273.50")
  })
})

describe("addCents", () => {
  it("sums without floating-point drift", () => {
    expect(addCents(1010, 2020, 3030)).toBe(6060)
    expect(centsToDollars(6060)).toBe(60.6)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/domain/money.test.ts
```

Expected: FAIL because `./money` cannot be resolved.

- [ ] **Step 3: Write minimal implementation**

```ts
export type Cents = number

export function dollarsToCents(dollars: number): Cents {
  if (!Number.isFinite(dollars)) {
    throw new Error("Amount must be a finite number")
  }
  return Math.round(dollars * 100)
}

export function centsToDollars(cents: Cents): number {
  return cents / 100
}

export function formatUsd(cents: Cents, options?: { compact?: boolean }): string {
  const dollars = centsToDollars(cents)
  const compact = options?.compact === true && cents % 100 === 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
  }).format(dollars)
}

export function addCents(...values: Cents[]): Cents {
  return values.reduce((sum, value) => sum + value, 0)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/domain/money.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/domain/money.ts tip-calendar-rn/src/domain/money.test.ts
git commit -m "$(cat <<'EOF'
feat: add cent-based money helpers

EOF
)"
```

---

### Task 3: Restaurant factory

**Files:**
- Create: `tip-calendar-rn/src/domain/restaurant.ts`
- Create: `tip-calendar-rn/src/domain/restaurant.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { createRestaurant } from "./restaurant"

describe("createRestaurant", () => {
  it("trims the name and marks the first restaurant as default", () => {
    const restaurant = createRestaurant({
      name: "  Bluebird Diner  ",
      now: "2026-08-21T20:00:00.000Z",
    })

    expect(restaurant.name).toBe("Bluebird Diner")
    expect(restaurant.isDefault).toBe(true)
    expect(restaurant.payType).toBe("none")
    expect(restaurant.payAmountCents).toBe(0)
    expect(restaurant.defaultTipOutRule).toEqual({ type: "none" })
    expect(restaurant.creditCardTipPayout).toBe("same_day")
  })

  it("rejects a blank name", () => {
    expect(() => createRestaurant({ name: "   " })).toThrow("Restaurant name is required")
  })

  it("stores hourly pay and a tips-percent tip-out", () => {
    const restaurant = createRestaurant({
      name: "Harbor Grill",
      payType: "hourly",
      payAmountCents: 1500,
      defaultTipOutRule: { type: "tips_percent", percent: 3 },
    })

    expect(restaurant.payType).toBe("hourly")
    expect(restaurant.payAmountCents).toBe(1500)
    expect(restaurant.defaultTipOutRule).toEqual({ type: "tips_percent", percent: 3 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/domain/restaurant.test.ts
```

Expected: FAIL because `createRestaurant` is not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Cents } from "./money"

export type PayType = "hourly" | "fixed" | "none"

export type TipOutRule =
  | { type: "none" }
  | { type: "fixed"; amountCents: Cents }
  | { type: "sales_percent"; percent: number }
  | { type: "tips_percent"; percent: number }

export type CreditCardTipPayout = "same_day" | "paycheck"

export type Restaurant = {
  id: string
  name: string
  isDefault: boolean
  payType: PayType
  payAmountCents: Cents
  creditCardTipPayout: CreditCardTipPayout
  defaultTipOutRule: TipOutRule
  createdAt: string
  updatedAt: string
}

export function createRestaurant(input: {
  name: string
  isDefault?: boolean
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
    id: input.id ?? `rst_${now}`,
    name,
    isDefault: input.isDefault ?? true,
    payType: input.payType ?? "none",
    payAmountCents: input.payAmountCents ?? 0,
    creditCardTipPayout: input.creditCardTipPayout ?? "same_day",
    defaultTipOutRule: input.defaultTipOutRule ?? { type: "none" },
    createdAt: now,
    updatedAt: now,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/domain/restaurant.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/domain/restaurant.ts tip-calendar-rn/src/domain/restaurant.test.ts
git commit -m "$(cat <<'EOF'
feat: add restaurant factory and pay/tip-out types

EOF
)"
```

---

### Task 4: Shift income and clock math

**Files:**
- Create: `tip-calendar-rn/src/domain/shift.ts`
- Create: `tip-calendar-rn/src/domain/shift.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { createRestaurant } from "./restaurant"
import {
  calculateHoursFromClock,
  calculateShiftIncome,
} from "./shift"

const hourlyRestaurant = createRestaurant({
  name: "Bluebird",
  payType: "hourly",
  payAmountCents: 1500,
})

describe("calculateHoursFromClock", () => {
  it("counts a same-day shift", () => {
    expect(calculateHoursFromClock("16:00", "22:30")).toEqual({
      hours: 6.5,
      overnight: false,
    })
  })

  it("treats an earlier clock-out as overnight, not an error", () => {
    expect(calculateHoursFromClock("21:00", "02:00")).toEqual({
      hours: 5,
      overnight: true,
    })
  })
})

describe("calculateShiftIncome", () => {
  it("computes tips, hourly wage, and net income", () => {
    const income = calculateShiftIncome({
      restaurant: hourlyRestaurant,
      hours: 6.5,
      cashTipsCents: 4200,
      cardTipsCents: 8800,
    })

    expect(income.totalTipsCents).toBe(13000)
    expect(income.wageIncomeCents).toBe(9750)
    expect(income.tipOutCents).toBe(0)
    expect(income.netIncomeCents).toBe(22750)
    expect(income.effectiveHourlyCents).toBe(3500)
  })

  it("uses fixed wage instead of hours times rate", () => {
    const restaurant = createRestaurant({
      name: "Fixed Place",
      payType: "fixed",
      payAmountCents: 4000,
    })
    const income = calculateShiftIncome({
      restaurant,
      hours: 8,
      cashTipsCents: 1000,
      cardTipsCents: 2000,
    })
    expect(income.wageIncomeCents).toBe(4000)
    expect(income.netIncomeCents).toBe(7000)
  })

  it("subtracts unpaid break from effective hours", () => {
    const income = calculateShiftIncome({
      restaurant: hourlyRestaurant,
      hours: 6,
      unpaidBreakHours: 0.5,
      cashTipsCents: 0,
      cardTipsCents: 0,
    })
    expect(income.effectiveHours).toBe(5.5)
    expect(income.wageIncomeCents).toBe(8250)
  })

  it("does not compute hourly rate when effective hours are 0", () => {
    const income = calculateShiftIncome({
      restaurant: hourlyRestaurant,
      hours: 0,
      cashTipsCents: 2000,
      cardTipsCents: 0,
    })
    expect(income.effectiveHourlyCents).toBeNull()
    expect(income.netIncomeCents).toBe(2000)
  })

  it("applies a tips-percent tip-out from total tips", () => {
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
    expect(income.totalTipsCents).toBe(10000)
    expect(income.tipOutCents).toBe(300)
    expect(income.netIncomeCents).toBe(9700)
  })

  it("applies a sales-percent tip-out from sales", () => {
    const restaurant = createRestaurant({
      name: "Sales Place",
      payType: "none",
      defaultTipOutRule: { type: "sales_percent", percent: 2 },
    })
    const income = calculateShiftIncome({
      restaurant,
      hours: 5,
      cashTipsCents: 1000,
      cardTipsCents: 1000,
      salesCents: 50000,
    })
    expect(income.tipOutCents).toBe(1000)
    expect(income.netIncomeCents).toBe(1000)
  })

  it("lets a shift override restaurant tip-out with a manual amount", () => {
    const restaurant = createRestaurant({
      name: "Override Place",
      defaultTipOutRule: { type: "tips_percent", percent: 5 },
    })
    const income = calculateShiftIncome({
      restaurant,
      hours: 5,
      cashTipsCents: 10000,
      cardTipsCents: 0,
      tipOutOverride: { type: "manual", amountCents: 250 },
    })
    expect(income.tipOutCents).toBe(250)
    expect(income.netIncomeCents).toBe(9750)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/domain/shift.test.ts
```

Expected: FAIL because `./shift` cannot be resolved.

- [ ] **Step 3: Write implementation**

```ts
import type { Cents } from "./money"
import { addCents } from "./money"
import type { Restaurant, ShiftTag, TipOutRule } from "./restaurant"

export type TipOutSnapshot = {
  rule: TipOutRule
  salesCents?: Cents
  amountCents: Cents
}

export type Shift = {
  id: string
  localDate: string
  restaurantId: string
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
  note?: string
  tag?: ShiftTag
  createdAt: string
  updatedAt: string
}

export type ManualTipOut = { type: "manual"; amountCents: Cents }

export type ShiftIncomeInput = {
  restaurant: Restaurant
  hours: number
  unpaidBreakHours?: number
  cashTipsCents: Cents
  cardTipsCents: Cents
  otherIncomeCents?: Cents
  salesCents?: Cents
  tipOutOverride?: TipOutRule | ManualTipOut
}

export type ShiftIncome = {
  totalTipsCents: Cents
  wageIncomeCents: Cents
  otherIncomeCents: Cents
  grossIncomeCents: Cents
  tipOutCents: Cents
  netIncomeCents: Cents
  effectiveHours: number
  effectiveHourlyCents: Cents | null
  tipOutSnapshot: TipOutSnapshot
}

function parseMinutes(clock: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(clock)
  if (!match) {
    throw new Error("Time must use HH:mm")
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) {
    throw new Error("Time must use HH:mm")
  }
  return hours * 60 + minutes
}

export function calculateHoursFromClock(
  clockIn: string,
  clockOut: string,
): { hours: number; overnight: boolean } {
  const start = parseMinutes(clockIn)
  const end = parseMinutes(clockOut)
  const overnight = end < start
  const minutes = overnight ? 24 * 60 - start + end : end - start
  return { hours: minutes / 60, overnight }
}

export function calculateEffectiveHours(rawHours: number, unpaidBreakHours = 0): number {
  if (!Number.isFinite(rawHours) || !Number.isFinite(unpaidBreakHours)) {
    throw new Error("Hours must be finite")
  }
  return Math.max(0, rawHours - unpaidBreakHours)
}

function calculateTipOutCents(input: {
  rule: TipOutRule | ManualTipOut
  totalTipsCents: Cents
  salesCents?: Cents
}): { amountCents: Cents; snapshot: TipOutSnapshot } {
  if (input.rule.type === "manual") {
    return {
      amountCents: input.rule.amountCents,
      snapshot: {
        rule: { type: "fixed", amountCents: input.rule.amountCents },
        amountCents: input.rule.amountCents,
      },
    }
  }

  if (input.rule.type === "none") {
    return { amountCents: 0, snapshot: { rule: input.rule, amountCents: 0 } }
  }

  if (input.rule.type === "fixed") {
    return {
      amountCents: input.rule.amountCents,
      snapshot: { rule: input.rule, amountCents: input.rule.amountCents },
    }
  }

  if (input.rule.type === "sales_percent") {
    const salesCents = input.salesCents ?? 0
    const amountCents = Math.round((salesCents * input.rule.percent) / 100)
    return {
      amountCents,
      snapshot: { rule: input.rule, salesCents, amountCents },
    }
  }

  const amountCents = Math.round((input.totalTipsCents * input.rule.percent) / 100)
  return {
    amountCents,
    snapshot: { rule: input.rule, amountCents },
  }
}

export function calculateShiftIncome(input: ShiftIncomeInput): ShiftIncome {
  const effectiveHours = calculateEffectiveHours(input.hours, input.unpaidBreakHours ?? 0)
  const totalTipsCents = addCents(input.cashTipsCents, input.cardTipsCents)
  const otherIncomeCents = input.otherIncomeCents ?? 0

  let wageIncomeCents = 0
  if (input.restaurant.payType === "hourly") {
    wageIncomeCents = Math.round(input.restaurant.payAmountCents * effectiveHours)
  } else if (input.restaurant.payType === "fixed") {
    wageIncomeCents = input.restaurant.payAmountCents
  }

  const rule = input.tipOutOverride ?? input.restaurant.defaultTipOutRule
  const tipOut = calculateTipOutCents({
    rule,
    totalTipsCents,
    salesCents: input.salesCents,
  })

  const grossIncomeCents = addCents(totalTipsCents, wageIncomeCents, otherIncomeCents)
  const netIncomeCents = grossIncomeCents - tipOut.amountCents
  const effectiveHourlyCents =
    effectiveHours > 0 ? Math.round(netIncomeCents / effectiveHours) : null

  return {
    totalTipsCents,
    wageIncomeCents,
    otherIncomeCents,
    grossIncomeCents,
    tipOutCents: tipOut.amountCents,
    netIncomeCents,
    effectiveHours,
    effectiveHourlyCents,
    tipOutSnapshot: tipOut.snapshot,
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
feat: add shift income and overnight clock math

EOF
)"
```

---

### Task 5: Calendar grouping

**Files:**
- Create: `tip-calendar-rn/src/domain/calendar.ts`
- Create: `tip-calendar-rn/src/domain/calendar.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { buildMonthGrid, groupNetIncomeByLocalDate, startOfWeek } from "./calendar"
import type { Shift } from "./shift"

function shift(localDate: string, netIncomeCents: number): Shift {
  return {
    id: `s-${localDate}-${netIncomeCents}`,
    localDate,
    restaurantId: "rst_1",
    hours: 5,
    unpaidBreakHours: 0,
    overnight: false,
    cashTipsCents: netIncomeCents,
    cardTipsCents: 0,
    otherIncomeCents: 0,
    tipOutSnapshot: { rule: { type: "none" }, amountCents: 0 },
    createdAt: "2026-08-21T00:00:00.000Z",
    updatedAt: "2026-08-21T00:00:00.000Z",
  }
}

describe("startOfWeek", () => {
  it("starts on Sunday by default", () => {
    expect(startOfWeek("2026-08-21", 0)).toBe("2026-08-16")
  })

  it("starts on Monday when preferences say so", () => {
    expect(startOfWeek("2026-08-21", 1)).toBe("2026-08-17")
  })
})

describe("buildMonthGrid", () => {
  it("builds August 2025 with Sunday-first weeks and trailing empty cells", () => {
    const grid = buildMonthGrid(2025, 8, 0)
    expect(grid[0]?.[0]).toBeNull()
    expect(grid[0]?.[5]).toEqual({ localDate: "2025-08-01", day: 1 })
    expect(grid[4]?.[6]).toEqual({ localDate: "2025-08-30", day: 30 })
    expect(grid[5]?.[0]).toEqual({ localDate: "2025-08-31", day: 31 })
  })
})

describe("groupNetIncomeByLocalDate", () => {
  it("sums same-day shifts and ignores other months", () => {
    const grouped = groupNetIncomeByLocalDate(
      [shift("2025-08-21", 14200), shift("2025-08-21", 13100), shift("2025-07-31", 9999)],
      (item) => item.cashTipsCents,
    )
    expect(grouped.get("2025-08-21")).toBe(27300)
    expect(grouped.get("2025-07-31")).toBe(9999)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/domain/calendar.test.ts
```

Expected: FAIL because `./calendar` cannot be resolved.

- [ ] **Step 3: Write implementation**

Work only with `YYYY-MM-DD` strings plus a local `Date` constructed as `new Date(year, monthIndex, day)`. Do not call `toISOString()` to get the calendar date.

```ts
export type LocalDate = string
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type MonthCell = {
  localDate: LocalDate
  day: number
}

function pad(value: number): string {
  return value.toString().padStart(2, "0")
}

export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseLocalDate(localDate: LocalDate): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate)
  if (!match) {
    throw new Error("Date must use YYYY-MM-DD")
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function startOfWeek(localDate: LocalDate, weekStartsOn: WeekStartsOn): LocalDate {
  const date = parseLocalDate(localDate)
  const weekday = date.getDay()
  const offset = (weekday - weekStartsOn + 7) % 7
  date.setDate(date.getDate() - offset)
  return toLocalDate(date)
}

export function buildMonthGrid(
  year: number,
  month: number,
  weekStartsOn: WeekStartsOn,
): Array<Array<MonthCell | null>> {
  const first = new Date(year, month - 1, 1)
  const firstWeekday = first.getDay()
  const leading = (firstWeekday - weekStartsOn + 7) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: Array<MonthCell | null> = Array.from({ length: leading }, () => null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    const localDate = `${year}-${pad(month)}-${pad(day)}`
    cells.push({ localDate, day })
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const rows: Array<Array<MonthCell | null>> = []
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7))
  }
  return rows
}

export function groupNetIncomeByLocalDate<T>(
  items: T[],
  netIncomeCents: (item: T) => number,
  localDate: (item: T) => LocalDate = (item) => (item as { localDate: LocalDate }).localDate,
): Map<LocalDate, number> {
  const grouped = new Map<LocalDate, number>()
  for (const item of items) {
    const key = localDate(item)
    grouped.set(key, (grouped.get(key) ?? 0) + netIncomeCents(item))
  }
  return grouped
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/domain/calendar.test.ts
```

Expected: PASS. If August 2025 leading blanks fail, print `grid[0]` and fix `weekStartsOn` offset; August 1 2025 is a Friday.

- [ ] **Step 5: Commit**

```bash
git add tip-calendar-rn/src/domain/calendar.ts tip-calendar-rn/src/domain/calendar.test.ts
git commit -m "$(cat <<'EOF'
feat: add local-date calendar grouping

EOF
)"
```

---

### Task 6: Local store

**Files:**
- Create: `tip-calendar-rn/src/storage/types.ts`
- Create: `tip-calendar-rn/src/storage/memoryStore.ts`
- Create: `tip-calendar-rn/src/storage/localStore.ts`
- Create: `tip-calendar-rn/src/storage/localStore.test.ts`

- [ ] **Step 1: Install AsyncStorage**

```bash
npx expo install @react-native-async-storage/async-storage
```

- [ ] **Step 2: Write the failing test**

```ts
import { createRestaurant } from "../domain/restaurant"
import { createLocalStore } from "./localStore"
import { createMemoryStore } from "./memoryStore"

describe("localStore", () => {
  it("starts empty and round-trips a restaurant", async () => {
    const store = createLocalStore(createMemoryStore())
    await expect(store.load()).resolves.toEqual({
      version: 1,
      restaurants: [],
      shifts: [],
      preferences: {
        weekStartsOn: 0,
        currencySymbol: "$",
        timeFormat: "12h",
      },
    })

    const restaurant = createRestaurant({ name: "Bluebird" })
    await store.save({
      version: 1,
      restaurants: [restaurant],
      shifts: [],
      preferences: {
        weekStartsOn: 0,
        currencySymbol: "$",
        timeFormat: "12h",
      },
    })

    const loaded = await store.load()
    expect(loaded.restaurants).toEqual([restaurant])
  })

  it("replaces invalid JSON with an empty state instead of throwing", async () => {
    const memory = createMemoryStore()
    await memory.setItem("tips-calendar/v1", "{not-json")
    const store = createLocalStore(memory)
    const loaded = await store.load()
    expect(loaded.restaurants).toEqual([])
    expect(loaded.shifts).toEqual([])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- src/storage/localStore.test.ts
```

Expected: FAIL because modules are missing.

- [ ] **Step 4: Write implementation**

`src/storage/types.ts`:

```ts
import type { Preferences, Restaurant } from "../domain/restaurant"
import type { Shift } from "../domain/shift"

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

export type AppState = {
  version: 1
  restaurants: Restaurant[]
  shifts: Shift[]
  preferences: Preferences
}

export const STORAGE_KEY = "tips-calendar/v1"

export const defaultPreferences: Preferences = {
  weekStartsOn: 0,
  currencySymbol: "$",
  timeFormat: "12h",
}

export const emptyState: AppState = {
  version: 1,
  restaurants: [],
  shifts: [],
  preferences: defaultPreferences,
}
```

Move `Preferences` into `src/domain/restaurant.ts` (or a new `src/domain/preferences.ts` if you prefer a split). Keep the type name `Preferences`. If you add `src/domain/preferences.ts`, export it from there and update the import above.

`src/storage/memoryStore.ts`:

```ts
import type { KeyValueStore } from "./types"

export function createMemoryStore(seed: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(seed))
  return {
    async getItem(key) {
      return data.get(key) ?? null
    },
    async setItem(key, value) {
      data.set(key, value)
    },
    async removeItem(key) {
      data.delete(key)
    },
  }
}
```

`src/storage/localStore.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage"
import { emptyState, STORAGE_KEY, type AppState, type KeyValueStore } from "./types"

export function createLocalStore(kv: KeyValueStore = AsyncStorage) {
  return {
    async load(): Promise<AppState> {
      const raw = await kv.getItem(STORAGE_KEY)
      if (!raw) {
        return emptyState
      }
      try {
        const parsed = JSON.parse(raw) as AppState
        if (parsed.version !== 1 || !Array.isArray(parsed.restaurants) || !Array.isArray(parsed.shifts)) {
          return emptyState
        }
        return {
          version: 1,
          restaurants: parsed.restaurants,
          shifts: parsed.shifts,
          preferences: parsed.preferences ?? emptyState.preferences,
        }
      } catch {
        return emptyState
      }
    },
    async save(state: AppState): Promise<void> {
      await kv.setItem(STORAGE_KEY, JSON.stringify(state))
    },
  }
}
```

Add to `src/domain/restaurant.ts`:

```ts
export type Preferences = {
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  currencySymbol: string
  timeFormat: "12h" | "24h"
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- src/storage/localStore.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tip-calendar-rn/src/storage tip-calendar-rn/src/domain/restaurant.ts
git commit -m "$(cat <<'EOF'
feat: add versioned local app store

EOF
)"
```

---

### Task 7: NativeWind and tokens

**Files:**
- Create: `tip-calendar-rn/tailwind.config.js`
- Create: `tip-calendar-rn/nativewind-env.d.ts`
- Create: `tip-calendar-rn/metro.config.js`
- Create: `tip-calendar-rn/babel.config.js`
- Create: `tip-calendar-rn/src/theme/colors.ts`
- Create: `tip-calendar-rn/src/theme/tokens.ts`
- Modify: `tip-calendar-rn/src/global.css`

- [ ] **Step 1: Install NativeWind**

Follow the current NativeWind Expo install for SDK 57. Prefer NativeWind 4 + Tailwind 3 if both v4 and v5 docs exist:

```bash
npx expo install nativewind
npm install --save-dev tailwindcss@3.4.17 prettier-plugin-tailwindcss
```

Do not invent a config that the official install doc does not show. After install, `metro.config.js` must wrap Expo's config with `withNativeWind`.

- [ ] **Step 2: Add tokens**

`src/theme/colors.ts`:

```ts
export const colors = {
  action: "#0066CC",
  ink: "#1D1D1F",
  muted: "#7A7A7A",
  canvas: "#FFFFFF",
  parchment: "#F5F5F7",
  hairline: "#E0E0E0",
  income: "#1F7A4D",
  danger: "#D70015",
  overlay: "rgba(0,0,0,0.4)",
} as const
```

`src/theme/tokens.ts`:

```ts
export const space = {
  screenX: 20,
  titleToContent: 16,
  section: 12,
  tap: 44,
} as const
```

`src/global.css` should start with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Keep existing CSS variables only if they do not fight the white canvas.

`tailwind.config.js` `content` must include `./src/**/*.{js,jsx,ts,tsx}`.

- [ ] **Step 3: Confirm the bundler starts**

```bash
npx expo start --clear
```

Expected: Metro starts without NativeWind / Tailwind config errors. Stop it after the first successful bundle.

- [ ] **Step 4: Commit**

```bash
git add tip-calendar-rn/tailwind.config.js tip-calendar-rn/nativewind-env.d.ts tip-calendar-rn/metro.config.js tip-calendar-rn/babel.config.js tip-calendar-rn/src/theme tip-calendar-rn/src/global.css tip-calendar-rn/package.json tip-calendar-rn/package-lock.json
git commit -m "$(cat <<'EOF'
feat: add NativeWind tokens for the iOS UI

EOF
)"
```

---

### Task 8: Calendar / Stats / Me tab shell

**Files:**
- Create: `tip-calendar-rn/src/app/(tabs)/_layout.tsx`
- Create: `tip-calendar-rn/src/app/(tabs)/index.tsx`
- Create: `tip-calendar-rn/src/app/(tabs)/stats.tsx`
- Create: `tip-calendar-rn/src/app/(tabs)/me.tsx`
- Modify: `tip-calendar-rn/src/app/_layout.tsx`
- Delete: `tip-calendar-rn/src/app/explore.tsx` after the new tabs render

- [ ] **Step 1: Replace the starter tabs**

Root `src/app/_layout.tsx` should be a Stack, not the starter `AppTabs` + splash overlay:

```tsx
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"

import "../global.css"

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  )
}
```

`src/app/(tabs)/_layout.tsx` uses Expo Router `Tabs` with three screens named `index`, `stats`, and `me`. Labels: `Calendar`, `Stats`, `Me`. Active color `#0066CC`. Inactive color `#7A7A7A`. White tab bar, no extra Record / Settings tab.

Placeholder screens only need a title:

- Calendar: `Tips Calendar`
- Stats: `Stats`
- Me: `Me`

Do not build the month grid, charts, or settings list yet.

- [ ] **Step 2: Verify tabs in the iOS simulator**

```bash
npx expo start --ios
```

Expected: three tabs switch; starter Home / Explore copy is gone; no crash.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all domain and storage tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tip-calendar-rn/src/app
git commit -m "$(cat <<'EOF'
feat: replace starter tabs with Calendar, Stats, and Me

EOF
)"
```

---

## Acceptance

- `npm test` passes for money, restaurant, shift, calendar, and local store.
- App opens on iOS simulator with Calendar / Stats / Me.
- Domain files import no `react-native` modules.
- Invalid stored JSON loads as empty state, not a red screen.
- No Record Shift form, no Onboarding, no pixel-matched Calendar / Stats / Me screens.
- Tab names, action color, and money/date conventions match the Figma contract above.

## Out of this phase

Onboarding, empty calendar UI, shift form, Day Details, Stats charts, Me list, backup, EAS.
