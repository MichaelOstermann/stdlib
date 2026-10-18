import type { Rect as R } from "../../src/Rect"
import { describe, expect, it } from "bun:test"
import { Rect } from "../../src/Rect"

// Sizes and positions that can not be added and subtracted again without a rounding error.
const rects: R[] = [
    { height: 0.7, left: 0.1, top: 0.2, width: 0.3 },
    { height: 33.3, left: 10.1, top: 20.2, width: 100.7 },
    { height: 917.0000001, left: 1 / 3, top: 2 / 3, width: 123.456 },
]

const unchanged: Record<string, (rect: R) => R> = {
    alignBottom: rect => Rect.alignBottom(rect, rect),
    alignCenter: rect => Rect.alignCenter(rect, rect),
    alignCenterX: rect => Rect.alignCenterX(rect, rect),
    alignCenterY: rect => Rect.alignCenterY(rect, rect),
    alignLeft: rect => Rect.alignLeft(rect, rect),
    alignRight: rect => Rect.alignRight(rect, rect),
    alignTop: rect => Rect.alignTop(rect, rect),
    intersection: rect => Rect.intersection(rect, Rect.expand(rect, 10)),
    moveBottomTo: rect => Rect.moveBottomTo(rect, Rect.bottom(rect)),
    moveLeftTo: rect => Rect.moveLeftTo(rect, rect.left),
    moveRightTo: rect => Rect.moveRightTo(rect, Rect.right(rect)),
    moveTopTo: rect => Rect.moveTopTo(rect, rect.top),
    scale: rect => Rect.scale(rect, 1),
    scaleX: rect => Rect.scaleX(rect, 1),
    scaleY: rect => Rect.scaleY(rect, 1),
    setBottom: rect => Rect.setBottom(rect, Rect.bottom(rect)),
    setCenter: rect => Rect.setCenter(rect, Rect.centerX(rect), Rect.centerY(rect)),
    setCenterX: rect => Rect.setCenterX(rect, Rect.centerX(rect)),
    setCenterY: rect => Rect.setCenterY(rect, Rect.centerY(rect)),
    setLeft: rect => Rect.setLeft(rect, rect.left),
    setRight: rect => Rect.setRight(rect, Rect.right(rect)),
    setTop: rect => Rect.setTop(rect, rect.top),
    takeBottomPct: rect => Rect.takeBottomPct(rect, 1),
    takeBottomPx: rect => Rect.takeBottomPx(rect, rect.height),
    takeRightPct: rect => Rect.takeRightPct(rect, 1),
    takeRightPx: rect => Rect.takeRightPx(rect, rect.width),
    union: rect => Rect.union(rect, Rect.shrink(rect, 0.05)),
}

describe("Rect", () => {
    for (const [name, run] of Object.entries(unchanged)) {
        it(`${name} should return the rect it was given when nothing changes`, () => {
            for (const rect of rects) expect(run(rect)).toBe(rect)
        })
    }

    it("intersection and union should return the rect that is the result", () => {
        const inner = { height: 10.5, left: 5.5, top: 5.5, width: 10.5 }
        const outer = { height: 100.1, left: 0.1, top: 0.1, width: 100.1 }
        expect(Rect.intersection(inner, outer)).toBe(inner)
        expect(Rect.intersection(outer, inner)).toBe(inner)
        expect(Rect.union(inner, outer)).toBe(outer)
        expect(Rect.union(outer, inner)).toBe(outer)
    })

    it("should still change what is different", () => {
        const rect = { height: 33.3, left: 10.1, top: 20.2, width: 100.7 }
        expect(Rect.scale(rect, 2)).toEqual({ height: 66.6, left: 10.1 + 100.7 / 2 - 100.7, top: 20.2 + 33.3 / 2 - 33.3, width: 201.4 })
        expect(Rect.scaleX(rect, 2).top).toBe(20.2)
        expect(Rect.setCenter(rect, Rect.centerX(rect), 0)).toEqual({ ...rect, top: -33.3 / 2 })
        expect(Rect.moveRightTo(rect, 200)).toEqual({ ...rect, left: 200 - 100.7 })
        expect(Rect.setLeft(rect, 20.1)).toEqual({ ...rect, left: 20.1, width: 10.1 + 100.7 - 20.1 })
        expect(Rect.takeRightPct(rect, 0.5)).toEqual({ ...rect, left: 10.1 + 100.7 - 50.35, width: 50.35 })
    })
})
