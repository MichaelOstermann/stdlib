import type { ReactNode } from "react"
import type { PopoverModal } from "../src/usePopover"
import type { TooltipModal } from "../src/useTooltip"
import { describe, expect, it } from "bun:test"
import { createElement, Fragment } from "react"
import { Modals } from "../src/Modals"
import { Popover } from "../src/Popover"
import { Tooltip } from "../src/Tooltip"
import { usePopover } from "../src/usePopover"
import { useTooltip } from "../src/useTooltip"
import { fakeDOM, render, send, sleep, unmountAll } from "./dom"

fakeDOM()

const options = { closeDuration: 5, openDuration: 5 }
let parentClicks = 0

function owner(popovers: PopoverModal[]): () => ReactNode {
    return function Owner(): ReactNode {
        const [mounted, triggerRef, popover] = usePopover(options)
        popovers.push(popover)
        return createElement(
            "div",
            { onClick: () => parentClicks++ },
            createElement("button", { ref: triggerRef }, "Due date"),
            mounted && createElement(Popover, { popover }, createElement("span", null, "Calendar")),
        )
    }
}

/** Renders a popover, and returns its trigger and the popover of the latest render. */
function setup(): { trigger: HTMLElement, popover: () => PopoverModal } {
    const popovers: PopoverModal[] = []
    const trigger = render(owner(popovers)).querySelector("button")!
    return { trigger, popover: () => popovers.at(-1)! }
}

function element(): HTMLElement | null {
    return document.querySelector(".modal.popover")
}

describe("usePopover", () => {
    it("should open and close with a click on the trigger, with aria-expanded on it", async () => {
        const { popover, trigger } = setup()
        expect(trigger.getAttribute("aria-expanded")).toBe("false")

        send(trigger, "click")
        expect(popover().$open()).toBe(true)
        expect(trigger.getAttribute("aria-expanded")).toBe("true")
        expect(element()?.textContent).toBe("Calendar")
        expect(Modals.stack).toEqual([popover()])

        send(trigger, "click")
        expect(popover().$open()).toBe(false)
        expect(trigger.getAttribute("aria-expanded")).toBe("false")
        expect(Modals.stack).toEqual([])
        await sleep(20)
        expect(element()).toBe(null)
    })

    it("should close on a click outside and on Esc, not on a click inside", () => {
        const { popover, trigger } = setup()
        send(trigger, "click")
        send(element()!.querySelector("span")!, "mousedown")
        expect(popover().$open()).toBe(true)
        send(document.body, "mousedown")
        expect(popover().$open()).toBe(false)

        send(trigger, "click")
        send(document.body, "Escape")
        expect(popover().$open()).toBe(false)
    })

    it("should close when another popover opens", () => {
        const a = setup()
        const b = setup()
        send(a.trigger, "click")
        send(b.trigger, "mousedown")
        send(b.trigger, "click")
        expect(a.popover().$open()).toBe(false)
        expect(b.popover().$open()).toBe(true)
        expect(Modals.stack).toEqual([b.popover()])
    })

    it("should keep clicks inside of it from the React parents, and limit its height to the room it has", () => {
        const { trigger } = setup()
        parentClicks = 0
        send(trigger, "click")
        expect(parentClicks).toBe(1)
        send(element()!.querySelector("span")!, "click")
        expect(parentClicks).toBe(1)
        expect(element()!.style.maxHeight).toMatch(/^\d+(\.\d+)?px$/)
        expect(element()!.style.overflowY).toBe("")
    })

    it("should share a trigger with a tooltip", async () => {
        let tooltip: TooltipModal | undefined
        let popover: PopoverModal | undefined
        const trigger = render(() => {
            const [tooltipMounted, triggerRef, self] = useTooltip({ ...options, delay: 5 })
            const [popoverMounted, , other] = usePopover({ ...options, $trigger: triggerRef })
            tooltip = self
            popover = other
            return createElement(
                Fragment,
                null,
                createElement("button", { ref: triggerRef }, "Due date"),
                tooltipMounted && createElement(Tooltip, { tooltip: self }, "Due date"),
                popoverMounted && createElement(Popover, { popover: other }, "Calendar"),
            )
        }).querySelector("button")!

        expect(popover!.$trigger).toBe(tooltip!.$trigger)
        send(trigger, "focus")
        await sleep(15)
        expect(tooltip!.$open()).toBe(true)
        send(trigger, "click")
        expect(tooltip!.$open()).toBe(false)
        expect(popover!.$open()).toBe(true)
        expect(trigger.getAttribute("aria-expanded")).toBe("true")
        expect(Modals.stack).toEqual([popover!])
    })

    it("should take itself off the stack when the component unmounts while open", () => {
        const { trigger } = setup()
        send(trigger, "click")
        expect(Modals.stack.length).toBe(1)
        unmountAll()
        expect(Modals.stack).toEqual([])
    })
})
