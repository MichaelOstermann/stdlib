import { describe, expect, it } from "bun:test"
import { popover } from "../../src/Placement/popover"
import { room } from "../../src/Placement/room"
import { tooltip } from "../../src/Placement/tooltip"
import { fakeDOM } from "../DOM/helpers"

fakeDOM()

const boundary = { height: 600, left: 0, top: 0, width: 800 }
const floating = { height: 100, left: 0, top: 0, width: 200 }
const at = (left: number, top: number) => ({ height: 20, left, top, width: 20 })

describe("Placement.room", () => {
    it("should pick the side with more room", () => {
        expect(room({ anchor: at(100, 100), boundary })).toEqual({ horizontal: "right", vertical: "down" })
        expect(room({ anchor: at(700, 500), boundary })).toEqual({ horizontal: "left", vertical: "up" })
    })

    it("should go down and right on a tie", () => {
        expect(room({ anchor: at(390, 290), boundary })).toEqual({ horizontal: "right", vertical: "down" })
    })
})

describe("Placement.popover", () => {
    it("should open on the side with more room, even when it fits on the other", () => {
        expect(popover({ anchor: at(100, 320), boundary, floating }).top).toBe(216)
        expect(popover({ anchor: at(100, 280), boundary, floating }).top).toBe(304)
    })
})

describe("Placement.tooltip", () => {
    it("should open below when it fits", () => {
        expect(tooltip({ anchor: at(100, 400), boundary, floating }).top).toBe(424)
    })

    it("should open above when it does not fit below", () => {
        expect(tooltip({ anchor: at(100, 480), boundary, floating }).top).toBe(376)
    })
})
