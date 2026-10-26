import type { ReactNode } from "react"
import type { Root } from "react-dom/client"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { afterAll, afterEach, beforeAll } from "bun:test"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { Modals } from "../src/Modals"

const globals = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
const roots: Root[] = []

/**
 * Renders with happy-dom in the tests of this file: everything rendered is unmounted, and the stack
 * emptied, after each test.
 */
export function fakeDOM(): void {
    beforeAll(() => {
        GlobalRegistrator.register()
        globals.IS_REACT_ACT_ENVIRONMENT = true
    })

    afterAll(async () => {
        delete globals.IS_REACT_ACT_ENVIRONMENT
        await GlobalRegistrator.unregister()
    })

    afterEach(() => {
        unmountAll()
        for (const modal of [...Modals.stack]) Modals.close(modal)
    })
}

/** Renders a component into its own container in `document.body`, and returns the container. */
export function render(component: () => ReactNode): HTMLElement {
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)
    roots.push(root)
    act(() => root.render(createElement(component)))
    return container
}

export function unmountAll(): void {
    act(() => {
        for (const root of roots.splice(0)) root.unmount()
    })
    document.body.replaceChildren()
}

/**
 * Sends an event to an element: `focus` and `blur` by focusing and blurring it, `Escape` as a
 * keydown.
 */
export function send(element: HTMLElement, type: string): void {
    act(() => {
        if (type === "focus") element.focus()
        else if (type === "blur") element.blur()
        else if (type === "Escape") element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }))
        else element.dispatchEvent(new MouseEvent(type, { bubbles: true }))
    })
}

export async function sleep(ms: number): Promise<void> {
    await act(() => Bun.sleep(ms))
}
