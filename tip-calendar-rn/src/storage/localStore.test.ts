import { createRestaurant } from "../domain/restaurant"
import { createLocalStore } from "./localStore"
import { createMemoryStore } from "./memoryStore"
import { emptyState } from "./types"

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
        analyticsConsent: null,
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
        analyticsConsent: null,
      },
    })

    const loaded = await store.load()
    expect(loaded.restaurants).toEqual([restaurant])
  })

  it("fills missing defaultRestaurantId on schemaVersion 2 documents", async () => {
    const memory = createMemoryStore()
    await memory.setItem(
      "tips-calendar/v1",
      JSON.stringify({
        schemaVersion: 2,
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
      schemaVersion: 2,
      preferences: { defaultRestaurantId: null },
    })
  })

  it("does not migrate version 1 documents", async () => {
    const memory = createMemoryStore()
    const raw = JSON.stringify({
      version: 1,
      restaurants: [{ id: "rst_1", name: "Bluebird" }],
      shifts: [{ id: "sft_1", localDate: "2026-08-21" }],
      preferences: { weekStartsOn: 0, currencySymbol: "$", timeFormat: "12h" },
    })
    await memory.setItem("tips-calendar/v1", raw)
    const store = createLocalStore(memory)
    await expect(store.load()).resolves.toEqual(emptyState)
    expect(await memory.getItem("tips-calendar/v1")).toBe(raw)
  })

  it("replaces invalid JSON with an empty state instead of throwing", async () => {
    const memory = createMemoryStore()
    await memory.setItem("tips-calendar/v1", "{not-json")
    const store = createLocalStore(memory)
    const loaded = await store.load()
    expect(loaded.restaurants).toEqual([])
    expect(loaded.shifts).toEqual([])
  })

  it("does not persist emptyState over unrecognized blobs", async () => {
    const memory = createMemoryStore()
    const raw = JSON.stringify({ hello: true })
    await memory.setItem("tips-calendar/v1", raw)
    const store = createLocalStore(memory)
    await expect(store.load()).resolves.toEqual(emptyState)
    expect(await memory.getItem("tips-calendar/v1")).toBe(raw)
  })

  it("does not persist empty collections over a corrupt version 1 blob", async () => {
    const memory = createMemoryStore()
    const raw = JSON.stringify({
      version: 1,
      restaurants: [{ id: "rst_1" }],
      shifts: null,
    })
    await memory.setItem("tips-calendar/v1", raw)
    const store = createLocalStore(memory)
    await expect(store.load()).resolves.toEqual(emptyState)
    expect(await memory.getItem("tips-calendar/v1")).toBe(raw)
  })
})
