import type { ReactNode } from "react"
import { describe, expect, it } from "bun:test"
import { act, createContext, createElement, StrictMode, use } from "react"
import { Dialog } from "../src/Dialog"
import { Dialogs } from "../src/Dialogs"
import { Modals } from "../src/Modals"
import { fakeDOM, render, send, sleep, unmountAll } from "./dom"

fakeDOM()

const options = { closeDuration: 5, name: "rename", openDuration: 5 }
const Theme = createContext("light")

function Rename({ dialog }: { dialog: Dialog<{ name: string }, string> }): ReactNode {
    const theme = use(Theme)
    const { name } = dialog.meta
    return createElement(
        Dialog,
        { className: "w-120", dialog, style: { marginTop: 40 } },
        createElement("span", null, `${name} ${theme}`),
        createElement("button", { onClick: () => dialog.done(`${name}!`) }, "Rename"),
    )
}

function backdrop(): HTMLElement | null {
    return document.querySelector(".modal.dialog")
}

function panel(): HTMLElement | null {
    return document.querySelector("[role=dialog]")
}

/**
 * Renders `<Dialogs />` inside a provider and `<StrictMode>`, and waits for what opens to render.
 */
async function host(): Promise<void> {
    render(() => createElement(StrictMode, null, createElement(Theme, { value: "dark" }, createElement(Dialogs))))
    await sleep(0)
}

/**
 * Opens a dialog and waits until it is opened. The promise is in an object, for `await` to not wait
 * for it as well.
 */
async function opened<T>(open: () => Promise<T>): Promise<{ result: Promise<T> }> {
    let result!: Promise<T>
    await act(async () => {
        result = open()
        await Bun.sleep(20)
    })
    return { result }
}

describe("Dialogs", () => {
    it("should render the component with its props and context, and resolve with what it passes to done", async () => {
        await host()
        const { result } = await opened(() => Dialogs.open(Rename, { name: "Task" }, options))

        expect(panel()?.querySelector("span")?.textContent).toBe("Task dark")
        expect(panel()?.className).toBe("w-120")
        expect(panel()?.style.marginTop).toBe("40px")
        expect(backdrop()?.className).toBe("modal dialog")
        expect(Modals.stack.map((modal) => [modal.kind, modal.name])).toEqual([["dialog", "rename"]])

        send(panel()!.querySelector("button")!, "click")
        expect(await result).toBe("Task!")
        expect(Modals.stack).toEqual([])
        expect(backdrop()?.getAttribute("data-status")).toBe("closing")
        await sleep(20)
        expect(backdrop()).toBe(null)
    })

    it("should resolve with undefined on Esc and on a click on the backdrop, not on a click inside", async () => {
        await host()
        const { result: first } = await opened(() => Dialogs.open(Rename, { name: "Task" }, options))
        send(document.body, "Escape")
        expect(await first).toBe(undefined)

        const { result: second } = await opened(() => Dialogs.open(Rename, { name: "Task" }, options))
        send(panel()!.querySelector("span")!, "mousedown")
        expect(Modals.stack.length).toBe(1)
        send(backdrop()!, "mousedown")
        expect(await second).toBe(undefined)
    })

    it("should close the dialog on top first", async () => {
        await host()
        const { result: first } = await opened(() => Dialogs.open(Rename, { name: "First" }, options))
        const { result: second } = await opened(() => Dialogs.open(Rename, { name: "Second" }, options))
        expect(document.querySelectorAll("[role=dialog]").length).toBe(2)

        send(document.body, "Escape")
        expect(await second).toBe(undefined)
        expect(Modals.stack.length).toBe(1)
        send(document.body, "Escape")
        expect(await first).toBe(undefined)
    })

    it("should show a dialog opened before <Dialogs /> mounted", async () => {
        const { result } = await opened(() => Dialogs.open(Rename, { name: "Early" }, options))
        await host()
        await sleep(20)
        expect(panel()?.querySelector("span")?.textContent).toBe("Early dark")
        send(panel()!.querySelector("button")!, "click")
        expect(await result).toBe("Early!")
    })

    it("should resolve with undefined and leave the stack when <Dialogs /> unmounts", async () => {
        await host()
        const { result } = await opened(() => Dialogs.open(Rename, { name: "Task" }, options))
        unmountAll()
        expect(await result).toBe(undefined)
        expect(Modals.stack).toEqual([])

        // Not shown again by the next <Dialogs />.
        await host()
        expect(panel()).toBe(null)
    })

    it("should resolve without a value for a dialog with nothing to return", async () => {
        function Info({ dialog }: { dialog: Dialog }): ReactNode {
            return createElement(Dialog, { dialog }, createElement("button", { onClick: () => dialog.done() }, "OK"))
        }
        await host()
        const { result } = await opened(() => Dialogs.open(Info))
        // @ts-expect-error Rename needs `{ name }`.
        void (() => Dialogs.open(Rename))
        // @ts-expect-error Rename needs `{ name }`.
        void (() => Dialogs.open(Rename, { title: "Task" }))
        send(panel()!.querySelector("button")!, "click")
        expect(await result).toBe(undefined)
    })
})
