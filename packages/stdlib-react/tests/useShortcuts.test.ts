import type { Root } from "react-dom/client"
import { DOM, Shortcut } from "@monstermann/stdlib-web"
import { afterEach, describe, expect, it, vi } from "bun:test"
import { act, createElement, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { useShortcuts } from "../src/useShortcuts"
import { fakeDOM } from "./dom"

declare module "@monstermann/stdlib-web" {
    interface ShortcutBinding {
        desc?: string
        whileTyping?: boolean
    }
}

fakeDOM()

afterEach(() => Shortcut.bindings.clear())

type Shortcuts = Parameters<typeof useShortcuts>[0]

/**
 * Renders `shortcuts` of a parent and of a child, again with each call of the returned function.
 */
function mount(props: { child?: Shortcuts, enabled?: boolean, parent: Shortcuts }, strict = false): { rerender: (props: { child?: Shortcuts, enabled?: boolean, parent: Shortcuts }) => void, unmount: () => void } {
    const root: Root = createRoot(document.createElement("div"))
    function Child({ enabled, shortcuts }: { enabled?: boolean, shortcuts: Shortcuts }) {
        useShortcuts(shortcuts, enabled)
        return null
    }
    function Parent({ child, enabled, parent }: { child?: Shortcuts, enabled?: boolean, parent: Shortcuts }) {
        useShortcuts(parent)
        return child ? createElement(Child, { enabled, shortcuts: child }) : null
    }
    const element = (props: { child?: Shortcuts, enabled?: boolean, parent: Shortcuts }) => strict ? createElement(StrictMode, null, createElement(Parent, props)) : createElement(Parent, props)
    act(() => root.render(element(props)))
    return {
        rerender: (props) => act(() => root.render(element(props))),
        unmount: () => act(() => root.unmount()),
    }
}

const shortcuts = (): string[] => [...Shortcut.bindings].map((binding) => binding.shortcut)

describe("useShortcuts", () => {
    it("should add a binding per shortcut while mounted", () => {
        const run = vi.fn()
        const { unmount } = mount({ parent: { "esc": run, "mod+k": { desc: "Search", run } } })
        expect([...Shortcut.bindings]).toEqual([{ run, shortcut: "esc" }, { desc: "Search", run, shortcut: "mod+k" }])
        unmount()
        expect(Shortcut.bindings.size).toBe(0)
    })

    it("should keep the order of mounting when the parent renders again", () => {
        const first = vi.fn()
        const second = vi.fn()
        const { rerender } = mount({ child: { down: vi.fn() }, parent: { down: first } })
        expect(shortcuts()).toEqual(["down", "down"])
        const [parent, child] = [...Shortcut.bindings]

        rerender({ child: { down: vi.fn() }, parent: { down: second } })
        expect([...Shortcut.bindings]).toEqual([parent!, child!])
        parent!.run()
        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
    })

    it("should update the fields of a binding in place", () => {
        const run = vi.fn()
        const { rerender } = mount({ parent: { enter: { desc: "Select", run, whileTyping: true } } })
        const [binding] = [...Shortcut.bindings]
        rerender({ parent: { enter: { desc: "Open", run } } })
        expect([...Shortcut.bindings]).toEqual([binding!])
        expect(binding).toEqual({ desc: "Open", run, shortcut: "enter" })
        rerender({ parent: { enter: run } })
        expect(binding).toEqual({ run, shortcut: "enter" })
    })

    it("should put a child after its parent, and a later sibling after an earlier one", () => {
        const root: Root = createRoot(document.createElement("div"))
        function Bind({ children, name }: { children?: ReturnType<typeof createElement>[], name: string }) {
            useShortcuts({ [name]: vi.fn() })
            return children ?? null
        }
        act(() => root.render(createElement(Bind, { name: "a" }, [createElement(Bind, { key: 1, name: "b" }, [createElement(Bind, { key: 1, name: "c" })]), createElement(Bind, { key: 2, name: "d" })])))
        expect(shortcuts()).toEqual(["a", "b", "c", "d"])
        act(() => root.unmount())
    })

    it("should add a new shortcut at the place of its component and remove one that is gone", () => {
        const { rerender } = mount({ child: { j: vi.fn() }, parent: { k: vi.fn() } })
        expect(shortcuts()).toEqual(["k", "j"])
        rerender({ child: { j: vi.fn() }, parent: { k: vi.fn(), l: vi.fn() } })
        expect(shortcuts()).toEqual(["k", "l", "j"])
        rerender({ child: { j: vi.fn() }, parent: { l: vi.fn() } })
        expect(shortcuts()).toEqual(["l", "j"])
    })

    it("should put what mounts later after everything before", () => {
        const { rerender } = mount({ parent: { k: vi.fn() } })
        mount({ parent: { x: vi.fn() } })
        rerender({ child: { j: vi.fn() }, parent: { k: vi.fn() } })
        expect(shortcuts()).toEqual(["k", "x", "j"])
    })

    it("should remove them while disabled and add them after everything else once enabled", () => {
        const { rerender } = mount({ child: { down: vi.fn() }, enabled: false, parent: { j: vi.fn() } })
        expect(shortcuts()).toEqual(["j"])
        rerender({ child: { down: vi.fn() }, enabled: true, parent: { j: vi.fn(), k: vi.fn() } })
        expect(shortcuts()).toEqual(["j", "k", "down"])
        rerender({ child: { down: vi.fn() }, enabled: false, parent: { j: vi.fn(), k: vi.fn() } })
        expect(shortcuts()).toEqual(["j", "k"])
    })

    it("should add each binding once in StrictMode", () => {
        const { unmount } = mount({ child: { down: vi.fn() }, parent: { down: vi.fn(), up: vi.fn() } }, true)
        expect(shortcuts()).toEqual(["down", "up", "down"])
        unmount()
        expect(Shortcut.bindings.size).toBe(0)
    })
})

describe("useShortcuts, with the loop of Shortcut.matches", () => {
    /** The loop from the docs of `Shortcut.matches`, with `whileTyping`. */
    function listen(): () => void {
        let pressed: KeyboardEvent[] = []
        const onKeyDown = (event: KeyboardEvent) => {
            pressed.push(event)
            for (const binding of [...Shortcut.bindings].reverse()) {
                if (!binding.whileTyping && DOM.isEditable(event.target)) continue
                const match = Shortcut.matches(binding.shortcut, pressed)
                if (!match) continue
                event.preventDefault()
                event.stopPropagation()
                if (match === true) {
                    pressed = []
                    binding.run()
                }
                return
            }
            pressed = []
        }
        window.addEventListener("keydown", onKeyDown, { capture: true })
        return () => window.removeEventListener("keydown", onKeyDown, { capture: true })
    }

    function press(target: Element, key: string, code: string, init: KeyboardEventInit = {}): void {
        target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code, key, ...init }))
    }

    it("should run the menu's binding before the editor sees the key, while typing in it", () => {
        const stop = listen()
        const editor = document.createElement("div")
        editor.contentEditable = "true"
        document.body.append(editor)
        const onEditorKey = vi.fn()
        editor.addEventListener("keydown", (event) => onEditorKey(event.key))

        const page = vi.fn()
        const select = vi.fn()
        const { rerender } = mount({ child: { enter: { run: select, whileTyping: true } }, enabled: false, parent: { enter: page, j: page } })

        press(editor, "j", "KeyJ")
        press(editor, "Enter", "Enter")
        expect(onEditorKey.mock.calls).toEqual([["j"], ["Enter"]])

        // The slash menu opens.
        rerender({ child: { enter: { run: select, whileTyping: true } }, enabled: true, parent: { enter: page, j: page } })
        press(editor, "Enter", "Enter")
        press(editor, "j", "KeyJ")
        expect(select).toHaveBeenCalledTimes(1)
        expect(page).not.toHaveBeenCalled()
        expect(onEditorKey.mock.calls).toEqual([["j"], ["Enter"], ["j"]])

        editor.remove()
        stop()
    })

    it("should wait for the rest of a sequence, with ctrl let go in between", () => {
        const stop = listen()
        const save = vi.fn()
        const theme = vi.fn()
        mount({ parent: { "ctrl+k": save, "ctrl+k ctrl+t": theme } })

        // The newest binding that matches decides: `ctrl+k ctrl+t` waits.
        press(document.body, "Control", "ControlLeft", { ctrlKey: true })
        press(document.body, "k", "KeyK", { ctrlKey: true })
        press(document.body, "Control", "ControlLeft", { ctrlKey: true })
        expect(theme).not.toHaveBeenCalled()
        press(document.body, "t", "KeyT", { ctrlKey: true })
        expect(theme).toHaveBeenCalledTimes(1)
        expect(save).not.toHaveBeenCalled()

        // Anything else drops what was pressed.
        press(document.body, "k", "KeyK", { ctrlKey: true })
        press(document.body, "x", "KeyX")
        press(document.body, "t", "KeyT", { ctrlKey: true })
        expect(theme).toHaveBeenCalledTimes(1)
        stop()
    })
})
