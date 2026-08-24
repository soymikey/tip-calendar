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
