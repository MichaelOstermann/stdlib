import { describe, expect, it } from "bun:test"
import { suggest } from "../../src/internals/suggest"

describe("suggest", () => {
    it("should find typos, missing and swapped letters", () => {
        expect(suggest("membres", ["members", "serve"])).toEqual(["members"])
        expect(suggest("membrs", ["members", "serve"])).toEqual(["members"])
        expect(suggest("mebmers", ["members", "serve"])).toEqual(["members"])
    })

    it("should find names that contain what was typed", () => {
        expect(suggest("mem", ["members", "serve"])).toEqual(["members"])
    })

    it("should put the closest first", () => {
        expect(suggest("ad", ["admin", "add"])).toEqual(["add", "admin"])
    })

    it("should find nothing when nothing comes close", () => {
        expect(suggest("xyz", ["members", "serve"])).toEqual([])
    })
})
