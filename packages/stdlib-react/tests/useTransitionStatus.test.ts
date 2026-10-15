import type { Transition } from "@monstermann/stdlib-web"
import { describe, expect, expectTypeOf, it } from "bun:test"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { useSignal } from "../src/useSignal"
import { useTransitionStatus } from "../src/useTransitionStatus"

function Status(options: { animateMount?: boolean, open: boolean }): string {
    const transition = useTransitionStatus({ ...options, closeDuration: 200, openDuration: 250 })
    return [useSignal(transition.$status), useSignal(transition.$mounted)].join(" ")
}

describe("useTransitionStatus", () => {
    it("should start as closed, and open once mounted", () => {
        expect(renderToString(createElement(Status, { open: false }))).toBe("closed false")
        expect(renderToString(createElement(Status, { open: true }))).toBe("closed false")
    })

    it("should start as opened when mounting is not animated", () => {
        expect(renderToString(createElement(Status, { animateMount: false, open: true }))).toBe("opened true")
        expect(renderToString(createElement(Status, { animateMount: false, open: false }))).toBe("closed false")
    })

    it("should return a transition", () => {
        expectTypeOf(useTransitionStatus).returns.toEqualTypeOf<Transition>()
    })
})
