import type { ReactNode } from "react"
import type { Modal } from "../src/Modals"
import type { TooltipModal } from "../src/useTooltip"
import type { TransitionStatus } from "../src/useTransitionStatus"
import { Signal } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { act, createElement, Fragment } from "react"
import { Modals } from "../src/Modals"
import { Tooltip } from "../src/Tooltip"
import { useTooltip } from "../src/useTooltip"
import { fakeDOM, render, send as sendTo, sleep, unmountAll } from "./dom"

let mounted = false
let tooltip: TooltipModal
let trigger: HTMLButtonElement

fakeDOM()

function Owner(): ReactNode {
    const [isMounted, triggerRef, self] = useTooltip({ closeDuration: 5, delay: 10, openDuration: 5 })
    mounted = isMounted
    tooltip = self
    return createElement(
        Fragment,
        null,
        createElement("button", { ref: triggerRef }, "Search"),
        isMounted && createElement(Tooltip, { tooltip: self }, "Search tasks"),
    )
}

function setup(): void {
    trigger = render(Owner).querySelector("button")!
}

function element(): Element | null {
    return document.querySelector(".modal.tooltip")
}

function send(type: string): void {
    sendTo(trigger, type)
}

describe("useTooltip", () => {
    it("should open once the pointer rests on the trigger, and close when it leaves", async () => {
        setup()
        send("mousemove")
        await sleep(5)
        send("mousemove")
        await sleep(5)
        expect(tooltip.$open()).toBe(false)
        await sleep(10)
        expect(tooltip.$open()).toBe(true)
        expect(mounted).toBe(true)
        expect(element()?.textContent).toBe("Search tasks")
        expect(element()?.getAttribute("role")).toBe("tooltip")
        expect(Modals.stack).toEqual([tooltip])

        send("mouseleave")
        expect(tooltip.$open()).toBe(false)
        expect(Modals.stack).toEqual([])
        await sleep(40)
        expect(mounted).toBe(false)
        expect(element()).toBe(null)
    })

    it("should stay closed after a click until the pointer leaves", async () => {
        setup()
        send("mousemove")
        send("click")
        send("mousemove")
        await sleep(20)
        expect(tooltip.$open()).toBe(false)
        send("mouseleave")
        send("mousemove")
        await sleep(20)
        expect(tooltip.$open()).toBe(true)
    })

    it("should open on focus and close on blur", async () => {
        setup()
        send("focus")
        await sleep(20)
        expect(tooltip.$open()).toBe(true)
        send("blur")
        expect(tooltip.$open()).toBe(false)
    })

    it("should only listen for the pointer leaving while it is on the trigger", async () => {
        setup()
        const added: string[] = []
        const addEventListener = trigger.addEventListener.bind(trigger)
        trigger.addEventListener = ((type: string, ...rest: [never, never]) => {
            added.push(type)
            addEventListener(type, ...rest)
        }) as typeof trigger.addEventListener
        for (let i = 0; i < 5; i++) send("mousemove")
        expect(added).toEqual(["mouseleave"])
        send("mouseleave")
        send("mousemove")
        expect(added).toEqual(["mouseleave", "mouseleave"])
    })

    it("should close when another modal opens", async () => {
        setup()
        send("focus")
        await sleep(20)
        const dialog: Modal = { $floating: Signal<Element | null>(null), $open: Signal(true), $status: Signal<TransitionStatus>("opened"), $trigger: Signal<Element | null>(null), kind: "dialog" }
        act(() => Modals.open(dialog))
        expect(tooltip.$open()).toBe(false)
        expect(Modals.stack).toEqual([dialog])
    })

    it("should take itself off the stack when the component unmounts while open", async () => {
        setup()
        send("focus")
        await sleep(20)
        expect(Modals.stack).toEqual([tooltip])
        unmountAll()
        expect(Modals.stack).toEqual([])
    })
})
