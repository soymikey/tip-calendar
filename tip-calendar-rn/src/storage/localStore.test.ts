import { createRestaurant } from "../domain/restaurant"
import { createLocalStore } from "./localStore"
import { createMemoryStore } from "./memoryStore"

const v1Restaurant = {
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

describe("localStore", () => {
  it("starts empty and round-trips a restaurant", async () => {
    const store = createLocalStore(createMemoryStore())
    await expect(store.load()).resolves.toEqual({
      schemaVersion: 2,
      restaurants: [],
      shifts: [],
      preferences: {
        weekStartsOn: 0,
        currencySymbol: "$",
        timeFormat: "12h",
        defaultRestaurantId: null,
      },
    })

    const restaurant = createRestaurant({ name: "Bluebird" })
    await store.save({
      schemaVersion: 2,
      restaurants: [restaurant],
      shifts: [],
      preferences: {
        weekStartsOn: 0,
        currencySymbol: "$",
        timeFormat: "12h",
        defaultRestaurantId: null,
      },
    })

    const loaded = await store.load()
    expect(loaded.restaurants).toEqual([restaurant])
  })

  it("fills missing defaultRestaurantId from existing v1 preferences", async () => {
    const memory = createMemoryStore()
    await memory.setItem(
      "tips-calendar/v1",
      JSON.stringify({
        version: 1,
        restaurants: [],
        shifts: [],
        preferences: {
          weekStartsOn: 0,
          currencySymbol: "$",
          timeFormat: "12h",
        },
      }),
    )
    const store = createLocalStore(memory)
    await expect(store.load()).resolves.toMatchObject({
      preferences: { defaultRestaurantId: null },
    })
  })

  it("loads v1 JSON as schemaVersion 2 with frozen net income", async () => {
    const memory = createMemoryStore()
    await memory.setItem(
      "tips-calendar/v1",
      JSON.stringify({
        version: 1,
        restaurants: [v1Restaurant],
        shifts: [v1Shift],
        preferences: { weekStartsOn: 0, currencySymbol: "$", timeFormat: "12h" },
      }),
    )
    const store = createLocalStore(memory)
    const loaded = await store.load()
    expect(loaded.schemaVersion).toBe(2)
    expect("version" in loaded).toBe(false)
    expect(loaded.shifts[0]?.id).toBe("sft_1")
    expect(loaded.shifts[0]?.incomeSnapshot.netIncomeCents).toBe(29829)
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
