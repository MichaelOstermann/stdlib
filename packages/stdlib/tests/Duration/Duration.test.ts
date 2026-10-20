import { afterEach, describe, expect, it, spyOn } from "bun:test"
import { Duration } from "../../src/Duration/index"

describe("Duration", () => {
    afterEach(() => spyOn(Math, "random").mockRestore())

    it("should have units in milliseconds", () => {
        expect(Duration.SECOND).toBe(1000)
        expect(Duration.MINUTE).toBe(60 * Duration.SECOND)
        expect(Duration.HOUR).toBe(60 * Duration.MINUTE)
        expect(Duration.DAY).toBe(24 * Duration.HOUR)
        expect(Duration.WEEK).toBe(7 * Duration.DAY)
    })

    describe("backoff", () => {
        it("should double with every attempt, up to the maximum", () => {
            expect(Duration.backoff(0, 1000, 60_000)).toBe(1000)
            expect(Duration.backoff(1, 1000, 60_000)).toBe(2000)
            expect(Duration.backoff(3, 1000, 60_000)).toBe(8000)
            expect(Duration.backoff(9, 1000, 60_000)).toBe(60_000)
            expect(Duration.backoff(5000, 1000, 60_000)).toBe(60_000)
        })
    })

    describe("jitter", () => {
        it("should add a part of the duration, 20% at most by default", () => {
            spyOn(Math, "random").mockReturnValue(0)
            expect(Duration.jitter(1000)).toBe(1000)
            spyOn(Math, "random").mockReturnValue(0.5)
            expect(Duration.jitter(1000)).toBe(1100)
            expect(Duration.jitter(1000, 0.5)).toBe(1250)
            expect(Duration.jitter(1000, 0)).toBe(1000)
            expect(Duration.jitter(0)).toBe(0)
        })

        it("should never be shorter", () => {
            for (let i = 0; i < 1000; i++) {
                const result = Duration.jitter(1000)
                expect(result).toBeGreaterThanOrEqual(1000)
                expect(result).toBeLessThanOrEqual(1200)
            }
        })
    })

    describe("parse", () => {
        it("should parse a number with a unit", () => {
            expect(Duration.parse("500ms")).toBe(500)
            expect(Duration.parse("10s")).toBe(10_000)
            expect(Duration.parse("5m")).toBe(300_000)
            expect(Duration.parse("1.5 h")).toBe(5_400_000)
            expect(Duration.parse(" 90D ")).toBe(7_776_000_000)
            expect(Duration.parse("2w")).toBe(1_209_600_000)
            expect(Duration.parse("0.0004ms")).toBe(0)
        })

        it("should return undefined for everything else", () => {
            for (const input of ["", "10", "s", "-1s", "1e3s", "1 minute", "1s 30ms", ".5s", "1.s", "1µs"]) {
                expect(Duration.parse(input)).toBeUndefined()
            }
        })
    })

    describe("format", () => {
        it("should write out what is not zero", () => {
            expect(Duration.format(90 * Duration.SECOND, "en")).toBe("1m 30s")
            expect(Duration.format(2 * Duration.DAY, "en")).toBe("2d")
            expect(Duration.format(Duration.DAY + Duration.HOUR + Duration.MINUTE + Duration.SECOND + 1, "en")).toBe("1d 1h 1m 1s 1ms")
            expect(Duration.format(1500.9, "en")).toBe("1s 500ms")
        })

        it("should take the options of Intl.DurationFormat", () => {
            expect(Duration.format(90 * Duration.SECOND, "en", { style: "short" })).toBe("1 min, 30 sec")
            expect(Duration.format(90 * Duration.SECOND, undefined, { fractionalDigits: 0 })).toBe(new Intl.DurationFormat(undefined, { style: "narrow" }).format({ minutes: 1, seconds: 30 }))
            expect(Duration.format(90 * Duration.SECOND, "de", { style: "long" })).toBe("1 Minute, 30 Sekunden")
            expect(Duration.format(Duration.HOUR + 5 * Duration.SECOND, "en", { style: "digital" })).toBe("1:00:05")
        })

        it("should write out nothing as seconds", () => {
            expect(Duration.format(0, "en")).toBe("0s")
            expect(Duration.format(0.4, "en", { style: "short" })).toBe("0 sec")
        })

        it("should write out what is negative", () => {
            expect(Duration.format(-90 * Duration.SECOND, "en")).toBe("-1m 30s")
        })

        it("should work without a language", () => {
            expect(Duration.format(Duration.MINUTE)).toBe(new Intl.DurationFormat(undefined, { style: "narrow" }).format({ minutes: 1 }))
        })
    })
})
