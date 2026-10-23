import { describe, expect, it } from "bun:test"
import { Color } from "../../src/Color/index"

const color = (l: number, c: number, h: number, alpha = 1): Color => ({ alpha, c, h, l })
const parse = (value: string): Color => Color.parse(value)!
// The same color, give or take float noise in the conversions.
const css = (value: Color | string): string => Color.oklch(typeof value === "string" ? parse(value) : value)

describe("Color", () => {
    describe("parse", () => {
        // Expected values from culori.
        it("should read hex", () => {
            expect(Color.oklch(parse("#1f2029"))).toBe("oklch(0.2465 0.0171 280.08)")
            expect(Color.oklch(parse("#7481B9"))).toBe("oklch(0.6153 0.0864 273.59)")
            expect(Color.oklch(parse("#0d1117ff"))).toBe("oklch(0.1763 0.014 258.36)")
            expect(parse("#fff")).toEqual(parse("#ffffff"))
            expect(parse("#f008")).toEqual(parse("#ff000088"))
        })

        it("should read rgb() and rgba()", () => {
            expect(Color.oklch(parse("rgb(10 200 30 / 50%)"))).toBe("oklch(0.7228 0.2385 143.16 / 0.5)")
            expect(parse("rgba(10, 200, 30, 0.5)")).toEqual(parse("rgb(10 200 30 / 50%)"))
            expect(parse("rgb(100% 0% 0%)")).toEqual(parse("#f00"))
        })

        it("should read hsl() and hsla()", () => {
            expect(css(parse("hsl(200 50% 40%)"))).toBe(css(parse("#337799")))
            expect(css(parse("hsl(200deg, 50%, 40%)"))).toBe(css(parse("#337799")))
            expect(css(parse("hsla(0.5turn 100% 50% / 0.5)"))).toBe(css(parse("rgb(0 255 255 / 0.5)")))
        })

        it("should read oklch()", () => {
            expect(parse("oklch(78% 0.2 262)")).toEqual(color(0.78, 0.2, 262))
            expect(parse("oklch(0.5 50% -90 / 25%)")).toEqual(color(0.5, 0.2, 270, 0.25))
            expect(parse("OKLCH(0.5 none none)")).toEqual(color(0.5, 0, 0))
        })

        it("should make gray have no chroma", () => {
            expect(parse("#ffffff")).toEqual(color(parse("#ffffff").l, 0, 0))
            expect(parse("#808080").c).toBe(0)
        })

        it("should be undefined for what is no color it reads", () => {
            expect(Color.parse("red")).toBeUndefined()
            expect(Color.parse("#12345")).toBeUndefined()
            expect(Color.parse("#ggg")).toBeUndefined()
            expect(Color.parse("rgb(1 2)")).toBeUndefined()
            expect(Color.parse("rgb(1px 2 3)")).toBeUndefined()
            expect(Color.parse("lab(50 20 20)")).toBeUndefined()
        })
    })

    describe("oklch", () => {
        it("should write the alpha only when there is transparency", () => {
            expect(Color.oklch(color(0.78, 0.2, 262))).toBe("oklch(0.78 0.2 262)")
            expect(Color.oklch(color(0.78, 0.2, 262, 0.5))).toBe("oklch(0.78 0.2 262 / 0.5)")
        })

        it("should round", () => {
            expect(Color.oklch(color(0.123456, 0.0123456, 123.456, 0.12345))).toBe("oklch(0.1235 0.0123 123.46 / 0.123)")
        })
    })

    describe("adjustments", () => {
        const blue = "oklch(0.5 0.1 262)"

        it("should change lightness within 0 and 1", () => {
            expect(Color.lighten(blue, 0.2)).toBe("oklch(0.7 0.1 262)")
            expect(Color.lighten(blue, 1)).toBe("oklch(1 0.1 262)")
            expect(Color.darken(blue, 0.2)).toBe("oklch(0.3 0.1 262)")
            expect(Color.darken(blue, 1)).toBe("oklch(0 0.1 262)")
        })

        it("should change chroma, down to gray", () => {
            expect(Color.saturate(blue, 0.05)).toBe("oklch(0.5 0.15 262)")
            expect(Color.desaturate(blue, 0.05)).toBe("oklch(0.5 0.05 262)")
            expect(Color.desaturate(blue, 1)).toBe("oklch(0.5 0 262)")
        })

        it("should set the alpha within 0 and 1", () => {
            expect(Color.alpha(blue, 0.5)).toBe("oklch(0.5 0.1 262 / 0.5)")
            expect(Color.alpha(blue, 2)).toBe(blue)
            expect(Color.alpha(blue, -1)).toBe("oklch(0.5 0.1 262 / 0)")
        })

        it("should set and turn the hue", () => {
            expect(Color.hue(blue, 20)).toBe("oklch(0.5 0.1 20)")
            expect(Color.hue(blue, -20)).toBe("oklch(0.5 0.1 340)")
            expect(Color.rotate(blue, 180)).toBe("oklch(0.5 0.1 82)")
            expect(Color.rotate("oklch(0.5 0.1 20)", -30)).toBe("oklch(0.5 0.1 350)")
        })

        it("should take any color it parses, and write oklch()", () => {
            expect(Color.lighten("#1f2029", 0.2)).toBe("oklch(0.4465 0.0171 280.08)")
            expect(Color.alpha("rgb(255 0 0)", 0.5)).toBe(css("rgb(255 0 0 / 0.5)"))
        })

        it("should leave a color it does not parse as it is", () => {
            expect(Color.lighten("red", 0.2)).toBe("red")
            expect(Color.darken("", 0.2)).toBe("")
            expect(Color.alpha("var(--bg)", 0.5)).toBe("var(--bg)")
            expect(Color.hue("nope", 20)).toBe("nope")
        })

        it("should give the same as one step after another, when steps are chained", () => {
            expect(Color.darken(Color.lighten(blue, 0.2), 0.2)).toBe(blue)
            expect(Color.rotate(Color.rotate(blue, 90), -90)).toBe(blue)
        })
    })

    describe("mix", () => {
        it("should be the ends at 0 and 1", () => {
            const from = "oklch(0.2 0.05 280)"
            const to = "oklch(0.8 0.2 262 / 0.5)"
            expect(Color.mix(from, to, 0)).toBe(from)
            expect(Color.mix(from, to, 1)).toBe(to)
        })

        it("should be the same as culori's interpolation in oklch", () => {
            expect(Color.mix("#1F2029", "oklch(78% 0.2 262)", 0.2)).toBe("oklch(0.3532 0.0537 276.46)")
        })

        it("should take the shorter way around the hue", () => {
            expect(Color.mix("oklch(0.5 0.1 350)", "oklch(0.5 0.1 30)", 0.5)).toBe("oklch(0.5 0.1 10)")
            expect(Color.mix("oklch(0.5 0.1 30)", "oklch(0.5 0.1 350)", 0.5)).toBe("oklch(0.5 0.1 10)")
        })

        it("should take the hue of the other side for gray", () => {
            expect(parse(Color.mix("#fff", "oklch(0.5 0.2 262)", 0.5)).h).toBe(262)
            expect(parse(Color.mix("oklch(0.5 0.2 262)", "#000", 0.5)).h).toBe(262)
        })

        it("should leave from as it is when either side does not parse", () => {
            expect(Color.mix("red", "#fff", 0.5)).toBe("red")
            expect(Color.mix("#fff", "red", 0.5)).toBe("#fff")
        })
    })

    describe("over", () => {
        it("should be what the browser paints", () => {
            expect(Color.over("rgb(255 0 0 / 50%)", "#fff")).toBe(css("rgb(255 127.5 127.5)"))
            expect(Color.over("#00f", "#fff")).toBe(css("#00f"))
            expect(Color.over("rgb(0 0 255 / 0)", "#fff")).toBe(css("#fff"))
        })

        it("should stay transparent on a transparent background", () => {
            expect(Color.over("rgb(255 0 0 / 50%)", "rgb(0 0 255 / 50%)")).toBe(css("rgb(170 0 85 / 0.75)"))
            expect(parse(Color.over("rgb(255 0 0 / 0)", "rgb(0 0 255 / 0)")).alpha).toBe(0)
            expect(Color.over("rgb(255 0 0 / 0.5)", "rgb(0 0 255 / 0)")).toBe(css("rgb(255 0 0 / 0.5)"))
        })

        it("should leave color as it is when either side does not parse", () => {
            expect(Color.over("red", "#fff")).toBe("red")
            expect(Color.over("rgb(255 0 0 / 50%)", "white")).toBe("rgb(255 0 0 / 50%)")
        })
    })
})
