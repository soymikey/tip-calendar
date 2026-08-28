#!/usr/bin/env node
/* eslint-disable no-console */

const { execFileSync, spawnSync } = require("node:child_process")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

const APP_ID = "app.tipcalendar"
const DEVICE_ID = process.env.MAESTRO_DEVICE_ID || "3FC8DF4F-EAD7-4A46-8847-934AB250D914"
const STORAGE_KEY = "tips-calendar/v1"
const MAESTRO_ENV = {
  ...process.env,
  JAVA_HOME: "/opt/homebrew/opt/openjdk",
  MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
  MAESTRO_CLI_NO_ANALYTICS: "1",
  PATH: `/opt/homebrew/opt/openjdk/bin:${process.env.PATH}`,
}

const restaurants = [
  {
    id: "e2e-fushimi",
    name: "fushimi",
    payType: "hourly",
    payAmountCents: 1200,
    creditCardTipPayout: "same_day",
    defaultTipOutRule: { type: "none" },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "e2e-abc",
    name: "abc",
    payType: "fixed",
    payAmountCents: 4500,
    creditCardTipPayout: "same_day",
    defaultTipOutRule: { type: "none" },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
]

const cases = [
  baseCase(1, { hours: 4.5, cash: 80, card: 120, base: { type: "hourly", amount: 12 }, tipOut: { type: "none" }, tag: "lunch", breakMinutes: 0, other: 0 }),
  baseCase(2, { restaurant: "abc", hours: 6, cash: 45.5, card: 100.25, base: { type: "fixed", amount: 50 }, tipOut: { type: "fixed", amount: 8 }, tag: "dinner", breakMinutes: 15, other: 10 }),
  baseCase(3, { hours: 7.25, cash: 20, card: 180, base: { type: "none" }, tipOut: { type: "tips_percent", percent: 10 }, tag: "dinner", breakMinutes: 30, other: 0 }),
  baseCase(4, { restaurant: "abc", hours: 5.5, cash: 90, card: 60, base: { type: "hourly", amount: 18.5 }, tipOut: { type: "sales_percent", percent: 4, sales: 900 }, tag: "lunch", breakMinutes: 0, other: 25 }),
  baseCase(5, { hours: 8, cash: 0, card: 210.75, base: { type: "fixed", amount: 40 }, tipOut: { type: "none" }, breakMinutes: 45, other: 5 }),
  baseCase(6, { restaurant: "abc", hours: 3.75, cash: 55, card: 30, base: { type: "none" }, tipOut: { type: "fixed", amount: 12.5 }, tag: "lunch", breakMinutes: 0, other: 0 }),
  baseCase(7, { hours: 6.5, cash: 100, card: 140, base: { type: "hourly", amount: 15 }, tipOut: { type: "tips_percent", percent: 7.5 }, tag: "dinner", breakMinutes: 20, other: 12 }),
  baseCase(8, { restaurant: "abc", hours: 7, cash: 35.25, card: 95.75, base: { type: "fixed", amount: 65 }, tipOut: { type: "sales_percent", percent: 3.5, sales: 1200 }, breakMinutes: 0, other: 0 }),
  baseCase(9, { hours: 4, cash: 60, card: 0, base: { type: "hourly", amount: 20 }, tipOut: { type: "none" }, tag: "lunch", breakMinutes: 0, other: 30 }),
  baseCase(10, { restaurant: "abc", hours: 9.5, cash: 125.5, card: 220.5, base: { type: "none" }, tipOut: { type: "tips_percent", percent: 15 }, tag: "dinner", breakMinutes: 60, other: 0 }),
  baseCase(11, { hours: 5.25, cash: 70, card: 80, base: { type: "fixed", amount: 30 }, tipOut: { type: "fixed", amount: 5 }, breakMinutes: 10, other: 7.5 }),
  baseCase(12, { restaurant: "abc", hours: 6.25, cash: 0, card: 155, base: { type: "hourly", amount: 13.75 }, tipOut: { type: "sales_percent", percent: 2, sales: 750 }, tag: "lunch", breakMinutes: 0, other: 0 }),
  baseCase(13, { hours: 6.5, cash: 82, card: 118, base: { type: "hourly", amount: 16 }, tipOut: { type: "none" }, tag: "dinner", breakMinutes: 30, other: 20, useClock: true }),
  baseCase(14, { restaurant: "abc", hours: 6.5, cash: 33, card: 177, base: { type: "fixed", amount: 55 }, tipOut: { type: "fixed", amount: 18 }, tag: "lunch", breakMinutes: 0, other: 0, useClock: true }),
  baseCase(15, { hours: 2.5, cash: 25.75, card: 40.25, base: { type: "none" }, tipOut: { type: "tips_percent", percent: 5 }, breakMinutes: 0, other: 0 }),
  baseCase(16, { restaurant: "abc", hours: 10, cash: 150, card: 310, base: { type: "hourly", amount: 22 }, tipOut: { type: "sales_percent", percent: 5, sales: 1800 }, tag: "dinner", breakMinutes: 30, other: 50 }),
  baseCase(17, { hours: 5.75, cash: 41, card: 99, base: { type: "fixed", amount: 22.5 }, tipOut: { type: "none" }, tag: "lunch", breakMinutes: 0, other: 3 }),
  baseCase(18, { restaurant: "abc", hours: 4.25, cash: 66, card: 44, base: { type: "none" }, tipOut: { type: "fixed", amount: 6 }, tag: "dinner", breakMinutes: 15, other: 0 }),
  baseCase(19, { hours: 7.75, cash: 88, card: 132, base: { type: "hourly", amount: 11 }, tipOut: { type: "tips_percent", percent: 12 }, breakMinutes: 0, other: 9 }),
  baseCase(20, { restaurant: "abc", hours: 6.5, cash: 54, card: 146, base: { type: "fixed", amount: 75 }, tipOut: { type: "sales_percent", percent: 1.5, sales: 1000 }, tag: "lunch", breakMinutes: 45, other: 0 }),
]

function baseCase(day, input) {
  return {
    date: `2026-08-${String(day).padStart(2, "0")}`,
    restaurant: input.restaurant || "fushimi",
    note: `E2E shift matrix ${day}`,
    ...input,
  }
}

function dollarsToCents(value) {
  return Math.round(value * 100)
}

function calculateExpected(testCase) {
  const totalTipsCents = dollarsToCents(testCase.cash) + dollarsToCents(testCase.card)
  const effectiveHours = Math.max(0, testCase.hours - (testCase.breakMinutes || 0) / 60)
  let wageIncomeCents = 0
  if (testCase.base.type === "hourly") {
    wageIncomeCents = Math.round(dollarsToCents(testCase.base.amount) * effectiveHours)
  } else if (testCase.base.type === "fixed") {
    wageIncomeCents = dollarsToCents(testCase.base.amount)
  }
  let tipOutCents = 0
  if (testCase.tipOut.type === "fixed") {
    tipOutCents = dollarsToCents(testCase.tipOut.amount)
  } else if (testCase.tipOut.type === "tips_percent") {
    tipOutCents = Math.round((totalTipsCents * testCase.tipOut.percent) / 100)
  } else if (testCase.tipOut.type === "sales_percent") {
    tipOutCents = Math.round((dollarsToCents(testCase.tipOut.sales) * testCase.tipOut.percent) / 100)
  }
  const otherIncomeCents = dollarsToCents(testCase.other || 0)
  const grossIncomeCents = totalTipsCents + wageIncomeCents + otherIncomeCents
  return {
    cardTipsCents: dollarsToCents(testCase.card),
    cashTipsCents: dollarsToCents(testCase.cash),
    effectiveHours,
    grossIncomeCents,
    netIncomeCents: grossIncomeCents - tipOutCents,
    otherIncomeCents,
    salesCents: testCase.tipOut.type === "sales_percent" ? dollarsToCents(testCase.tipOut.sales) : undefined,
    tipOutCents,
    totalTipsCents,
    wageIncomeCents,
  }
}

function q(value) {
  return JSON.stringify(String(value))
}

function step(lines, text = "") {
  lines.push(text)
}

function tapId(lines, id) {
  step(lines, `- tapOn:`)
  step(lines, `    id: ${q(id)}`)
}

function inputInto(lines, id, value, options = {}) {
  tapId(lines, id)
  if (options.erase) {
    step(lines, "- eraseText")
  }
  step(lines, `- inputText: ${q(value)}`)
}

function scrollTo(lines, text) {
  step(lines, "- scrollUntilVisible:")
  step(lines, "    element:")
  step(lines, `      text: ${q(`.*${text}.*`)}`)
  step(lines, "    direction: DOWN")
  step(lines, "    timeout: 10000")
}

function generateFlow(testCase) {
  const lines = ["appId: app.tipcalendar", "---"]
  step(lines, "- runFlow:")
  step(lines, "    when:")
  step(lines, `      visible: "Open"`)
  step(lines, "    commands:")
  step(lines, `      - tapOn: "Open"`)
  step(lines, "- runFlow:")
  step(lines, "    when:")
  step(lines, `      visible: "Continue"`)
  step(lines, "    commands:")
  step(lines, `      - tapOn: "Continue"`)
  step(lines, "- runFlow:")
  step(lines, "    when:")
  step(lines, `      visible: "Close"`)
  step(lines, "    commands:")
  step(lines, `      - tapOn: "Close"`)
  step(lines, "- extendedWaitUntil:")
  step(lines, `    visible: "Record Shift"`)
  step(lines, "    timeout: 10000")
  step(lines, `- assertVisible: ${q(`.*${testCase.date.replace(/^2026-08-0?/, "August ")}.*`)}`)

  if (testCase.restaurant === "abc") {
    tapId(lines, "shift-restaurant-picker")
    step(lines, `- tapOn: "abc"`)
  }

  if (testCase.useClock) {
    scrollTo(lines, "More Options")
    step(lines, `- tapOn: ".*More Options"`)
    tapId(lines, "shift-use-clock-switch")
    step(lines, `- assertVisible: "Clock In"`)
    step(lines, `- assertVisible: "Clock Out"`)
  } else {
    inputInto(lines, "shift-hours-input", testCase.hours)
  }

  inputInto(lines, "shift-cash-tips-input", testCase.cash)
  inputInto(lines, "shift-card-tips-input", testCase.card)
  step(lines, `- tapOn: "Record Shift"`)

  scrollTo(lines, "Base Pay")
  tapId(lines, "shift-base-pay-expander")
  if (testCase.base.type === "hourly") {
    step(lines, `- tapOn: "Hourly"`)
    inputInto(lines, "shift-base-pay-input", testCase.base.amount, { erase: true })
  } else if (testCase.base.type === "fixed") {
    step(lines, `- tapOn: "Per Shift"`)
    inputInto(lines, "shift-base-pay-input", testCase.base.amount, { erase: true })
  } else {
    step(lines, `- tapOn: "No Base Pay"`)
  }
  if (testCase.base.type === "hourly") {
    step(lines, `- tapOn: ".*Base pay amount.*"`)
  } else if (testCase.base.type === "fixed") {
    step(lines, `- tapOn: ".*Base pay amount.*"`)
  }

  scrollTo(lines, "Tip-out")
  tapId(lines, "shift-tip-out-expander")
  if (testCase.tipOut.type === "fixed") {
    step(lines, `- tapOn: "Fixed"`)
    inputInto(lines, "shift-tip-out-amount-input", testCase.tipOut.amount)
  } else if (testCase.tipOut.type === "sales_percent") {
    step(lines, `- tapOn: "% Sales"`)
    inputInto(lines, "shift-tip-out-percent-input", testCase.tipOut.percent)
    inputInto(lines, "shift-sales-input", testCase.tipOut.sales)
  } else if (testCase.tipOut.type === "tips_percent") {
    step(lines, `- tapOn: "% Tips"`)
    inputInto(lines, "shift-tip-out-percent-input", testCase.tipOut.percent)
  } else {
    step(lines, `- tapOn: "None"`)
  }
  if (testCase.tipOut.type !== "none") {
    step(lines, `- tapOn: ".*Tip-out amount.*"`)
  }

  scrollTo(lines, "More Options")
  step(lines, "- runFlow:")
  step(lines, "    when:")
  step(lines, `      visible: ".*More Options"`)
  step(lines, "    commands:")
  step(lines, `      - tapOn:`)
  step(lines, `          id: "shift-more-options-expander"`)
  if (testCase.tag) {
    step(lines, `- tapOn: ${q(testCase.tag === "lunch" ? "Lunch" : "Dinner")}`)
  }
  inputInto(lines, "shift-unpaid-break-input", testCase.breakMinutes || 0)
  inputInto(lines, "shift-other-income-input", testCase.other || 0)
  inputInto(lines, "shift-notes-input", testCase.note)
  step(lines, `- tapOn: "Net Income"`)
  step(lines, `- assertVisible: "Net Income"`)
  step(lines, `- tapOn: "Save Shift"`)
  step(lines, "- extendedWaitUntil:")
  step(lines, `    visible: "Tip Calendar"`)
  step(lines, "    timeout: 10000")
  return `${lines.join("\n")}\n`
}

function storagePaths() {
  const dataContainer = execFileSync("xcrun", ["simctl", "get_app_container", "booted", APP_ID, "data"], {
    encoding: "utf8",
  }).trim()
  const storageDir = path.join(dataContainer, "Library/Application Support/app.tipcalendar/RCTAsyncLocalStorage_V1")
  return {
    dataContainer,
    manifestPath: path.join(storageDir, "manifest.json"),
    storageDir,
  }
}

function readState(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  return JSON.parse(manifest[STORAGE_KEY])
}

function writeState(manifestPath, state) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, JSON.stringify({ [STORAGE_KEY]: JSON.stringify(state) }, null, 2))
}

function seedState(manifestPath) {
  writeState(manifestPath, {
    schemaVersion: 2,
    restaurants,
    shifts: [],
    preferences: {
      weekStartsOn: 0,
      currencySymbol: "$",
      timeFormat: "12h",
      defaultRestaurantId: "e2e-fushimi",
    },
  })
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: options.env || process.env,
    stdio: options.stdio || "pipe",
  })
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n")
    throw new Error(`${command} ${args.join(" ")} failed\n${output}`)
  }
  return result
}

function runMaestro(flowPath, index) {
  const debugDir = path.join(os.tmpdir(), "tipcalendar-shift-matrix-debug", `case-${String(index).padStart(2, "0")}`)
  fs.rmSync(debugDir, { force: true, recursive: true })
  run(
    "maestro",
    ["--device", DEVICE_ID, "test", "--test-output-dir", debugDir, flowPath],
    { env: MAESTRO_ENV, stdio: "inherit" },
  )
}

function verifyState(manifestPath) {
  const state = readState(manifestPath)
  const failures = []
  if (state.restaurants.length !== 2) {
    failures.push(`expected 2 restaurants, got ${state.restaurants.length}`)
  }
  if (state.shifts.length !== cases.length) {
    failures.push(`expected ${cases.length} shifts, got ${state.shifts.length}`)
  }
  for (const testCase of cases) {
    const shift = state.shifts.find((item) => item.localDate === testCase.date)
    const expected = calculateExpected(testCase)
    if (!shift) {
      failures.push(`${testCase.date}: missing shift`)
      continue
    }
    const checks = {
      restaurantName: testCase.restaurant,
      hours: testCase.hours,
      unpaidBreakHours: (testCase.breakMinutes || 0) / 60,
      cashTipsCents: expected.cashTipsCents,
      cardTipsCents: expected.cardTipsCents,
      otherIncomeCents: expected.otherIncomeCents,
      salesCents: expected.salesCents,
      tag: testCase.tag,
      note: testCase.note,
      overnight: Boolean(testCase.useClock),
    }
    if (testCase.useClock) {
      checks.clockIn = "18:00"
      checks.clockOut = "00:30"
    }
    for (const [key, expectedValue] of Object.entries(checks)) {
      if (shift[key] !== expectedValue) {
        failures.push(`${testCase.date}: ${key} expected ${expectedValue}, got ${shift[key]}`)
      }
    }
    const payType = testCase.base.type === "none" ? "none" : testCase.base.type
    const payAmountCents = testCase.base.type === "none" ? 0 : dollarsToCents(testCase.base.amount)
    if (shift.paySnapshot.payType !== payType) {
      failures.push(`${testCase.date}: payType expected ${payType}, got ${shift.paySnapshot.payType}`)
    }
    if (shift.paySnapshot.payAmountCents !== payAmountCents) {
      failures.push(`${testCase.date}: payAmountCents expected ${payAmountCents}, got ${shift.paySnapshot.payAmountCents}`)
    }
    if (shift.tipOutSnapshot.type !== testCase.tipOut.type) {
      failures.push(`${testCase.date}: tipOut type expected ${testCase.tipOut.type}, got ${shift.tipOutSnapshot.type}`)
    }
    if (shift.tipOutSnapshot.amountCents !== expected.tipOutCents) {
      failures.push(`${testCase.date}: tipOut amount expected ${expected.tipOutCents}, got ${shift.tipOutSnapshot.amountCents}`)
    }
    for (const [key, expectedValue] of Object.entries({
      totalTipsCents: expected.totalTipsCents,
      wageIncomeCents: expected.wageIncomeCents,
      otherIncomeCents: expected.otherIncomeCents,
      grossIncomeCents: expected.grossIncomeCents,
      tipOutCents: expected.tipOutCents,
      netIncomeCents: expected.netIncomeCents,
      effectiveHours: expected.effectiveHours,
    })) {
      if (shift.incomeSnapshot[key] !== expectedValue) {
        failures.push(`${testCase.date}: incomeSnapshot.${key} expected ${expectedValue}, got ${shift.incomeSnapshot[key]}`)
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`Shift matrix verification failed:\n${failures.join("\n")}`)
  }
}

function main() {
  const { manifestPath } = storagePaths()
  const originalManifest = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, "utf8") : null
  const flowDir = fs.mkdtempSync(path.join(os.tmpdir(), "tipcalendar-shift-matrix-"))
  try {
    run("xcrun", ["simctl", "terminate", "booted", APP_ID], { stdio: "ignore" })
  } catch {}
  try {
    seedState(manifestPath)
    run("xcrun", ["simctl", "launch", "booted", APP_ID], { stdio: "ignore" })
    for (let index = 0; index < cases.length; index += 1) {
      const testCase = cases[index]
      const flowPath = path.join(flowDir, `case-${String(index + 1).padStart(2, "0")}.yaml`)
      fs.writeFileSync(flowPath, generateFlow(testCase))
      console.log(`\n[${index + 1}/${cases.length}] Creating ${testCase.date} (${testCase.restaurant})`)
      run("xcrun", ["simctl", "openurl", "booted", `tipcalendar://shift/new?date=${testCase.date}`], { stdio: "inherit" })
      runMaestro(flowPath, index + 1)
    }
    verifyState(manifestPath)
    console.log(`\nVerified ${cases.length} UI-created shifts against local storage.`)
  } finally {
    try {
      run("xcrun", ["simctl", "terminate", "booted", APP_ID], { stdio: "ignore" })
    } catch {}
    if (originalManifest === null) {
      fs.rmSync(manifestPath, { force: true })
    } else {
      fs.writeFileSync(manifestPath, originalManifest)
    }
    try {
      run("xcrun", ["simctl", "launch", "booted", APP_ID], { stdio: "ignore" })
    } catch {}
    fs.rmSync(flowDir, { force: true, recursive: true })
  }
}

main()
