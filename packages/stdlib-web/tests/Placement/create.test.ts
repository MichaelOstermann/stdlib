import type { PlacementName } from "../../src/Placement"
import { describe, expect, it } from "bun:test"
import { create } from "../../src/Placement/create"
import { dom, fakeDOM } from "../DOM/helpers"

fakeDOM()

const boundary = { height: 600, left: 0, top: 0, width: 800 }
const anchor = { height: 40, left: 300, top: 200, width: 100 }
const floating = { height: 100, left: 0, top: 0, width: 200 }

describe("Placement.create", () => {
    it.each<[PlacementName, { left: number, originX: number, originY: number, top: number }]>([
        ["down-center", { left: 250, originX: 100, originY: 0, top: 244 }],
        ["down-left", { left: 200, originX: 200, originY: 0, top: 244 }],
        ["down-right", { left: 300, originX: 0, originY: 0, top: 244 }],
        ["up-center", { left: 250, originX: 100, originY: 100, top: 96 }],
        ["up-left", { left: 200, originX: 200, originY: 100, top: 96 }],
        ["up-right", { left: 300, originX: 0, originY: 100, top: 96 }],
        ["left-center", { left: 96, originX: 200, originY: 50, top: 170 }],
        ["left-down", { left: 96, originX: 200, originY: 0, top: 200 }],
        ["left-up", { left: 96, originX: 200, originY: 100, top: 140 }],
        ["right-center", { left: 404, originX: 0, originY: 50, top: 170 }],
        ["right-down", { left: 404, originX: 0, originY: 0, top: 200 }],
        ["right-up", { left: 404, originX: 0, originY: 100, top: 140 }],
    ])("should place %s", (name, expected) => {
        expect(create(name, { anchor, boundary, floating })).toMatchObject({ ...expected, fits: true })
    })

    it("should report the room on the chosen side as maxHeight", () => {
        expect(create("down-center", { anchor, boundary, floating }).maxHeight).toBe(346)
        expect(create("up-center", { anchor, boundary, floating }).maxHeight).toBe(186)
        expect(create("left-center", { anchor, boundary, floating }).maxHeight).toBe(580)
    })

    it("should take the gaps", () => {
        const position = create("up-right", { anchor, boundary, floating }, { anchorGap: 0, boundaryGap: 0 })
        expect(position).toMatchObject({ left: 300, maxHeight: 200, top: 100 })
    })

    it("should push the floating rect back inside the boundary along the anchor", () => {
        const corner = { height: 20, left: 760, top: 20, width: 30 }
        const position = create("down-center", { anchor: corner, boundary, floating })
        expect(position).toMatchObject({ fits: true, left: 590, originX: 185, top: 44 })
    })

    it("should keep the origin on the floating rect when the anchor is beside it", () => {
        const outside = { height: 20, left: 795, top: 20, width: 100 }
        expect(create("down-right", { anchor: outside, boundary, floating }).originX).toBe(200)
    })

    it("should not fit when the room on the side is too small", () => {
        const low = { height: 40, left: 300, top: 500, width: 100 }
        const down = create("down-center", { anchor: low, boundary, floating })
        expect(down).toMatchObject({ fits: false, maxHeight: 46, top: 544 })
        expect(create("up-center", { anchor: low, boundary, floating }).fits).toBe(true)
    })

    it("should stay at the boundary edge when there is no room above", () => {
        const high = { height: 40, left: 300, top: 50, width: 100 }
        const up = create("up-center", { anchor: high, boundary, floating })
        expect(up).toMatchObject({ fits: false, maxHeight: 36, originY: 36, top: 10 })
    })

    it("should not fit when the floating rect is wider than the boundary", () => {
        const wide = { ...floating, width: 790 }
        expect(create("down-center", { anchor, boundary, floating: wide })).toMatchObject({ fits: false, left: 10 })
    })

    it("should stay inside when the anchor is outside of the boundary", () => {
        const below = { height: 40, left: 300, top: 700, width: 100 }
        expect(create("down-center", { anchor: below, boundary, floating })).toMatchObject({ fits: false, maxHeight: 0, top: 590 })
        expect(create("up-center", { anchor: below, boundary, floating })).toMatchObject({ fits: true, top: 490 })
    })

    it("should round the position to device pixels", () => {
        dom.window.devicePixelRatio = 2
        const position = create("down-center", { anchor: { ...anchor, left: 300.3, top: 200.3 }, boundary, floating })
        expect(position).toMatchObject({ left: 250.5, top: 244.5 })
    })
})
