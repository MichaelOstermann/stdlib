import { describe, expect, expectTypeOf, it } from "bun:test"
import { TSID } from "../src/TSID"

describe("TSID.create", () => {
    it("should be 13 characters of Crockford's base 32", () => {
        expect(TSID.create()).toMatch(/^[0-9A-F][0-9A-HJKMNP-TV-Z]{12}$/)
    })

    it("should sort in the order they were created", () => {
        const ids = Array.from({ length: 10_000 }, () => TSID.create())
        expect(ids.toSorted()).toEqual(ids)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("should be a TSID, and not take a plain string for one", () => {
        expectTypeOf(TSID.create()).toEqualTypeOf<TSID>()
        // @ts-expect-error a plain string is not a TSID
        TSID.timestamp("0ARYZ1J9QW5KD")
    })
})

describe("TSID.parse", () => {
    it("should take a TSID", () => {
        const id = TSID.create()
        expect(TSID.parse(id).unwrap()).toBe(id)
        expectTypeOf(TSID.parse(id).unwrap()).toEqualTypeOf<TSID>()
    })

    it("should fail for anything else", () => {
        for (const value of ["", "0ARYZ1J9QW5K", "0ARYZ1J9QW5KDA", "0aryz1j9qw5kd", "0ARYZ1J9QW5KI", "GARYZ1J9QW5KD"]) {
            expect(TSID.parse(value).value).toEqual({ message: `Invalid TSID "${value}"`, name: "TSIDError" })
        }
    })
})

describe("TSID.timestamp", () => {
    it("should be when the TSID was created", () => {
        const before = Date.now()
        const id = TSID.create()
        expect(TSID.timestamp(id)).toBeGreaterThanOrEqual(before)
        expect(TSID.timestamp(id)).toBeLessThanOrEqual(Date.now() + 1)
    })

    it("should read the format of tsid-ts", () => {
        // TSID.fromString("0AXFXR5W7VBX0") of tsid-ts is 0x0575FDC1787DAFA0.
        const id = TSID.parse("0AXFXR5W7VBX0").unwrap()
        expect(TSID.timestamp(id)).toBe(Number(0x0575FDC1787DAFA0n >> 22n) + Date.UTC(2020, 0, 1))
    })
})
