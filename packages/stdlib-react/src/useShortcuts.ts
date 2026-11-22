import type { ShortcutBinding } from "@monstermann/stdlib-web"
import { Shortcut } from "@monstermann/stdlib-web"
import { useLayoutEffect, useRef, useState } from "react"

/**
 * The place of a component in `Shortcut.bindings`. The place is the order of the first render: a
 * parent before its children, a sibling before the next sibling. Effects run in the opposite order,
 * from the inside out.
 */
let rendered = 0
const nextRank = (): number => rendered++
const ranks = new WeakMap<ShortcutBinding, number>()

/**
 * `useShortcuts(shortcuts, enabled?)`
 *
 * Adds a binding to `Shortcut.bindings` for each of `shortcuts`. The bindings stay while the
 * component is mounted and `enabled` is `true`, the default. Each shortcut maps to a function, or
 * to a binding without its shortcut for fields that an app adds to `ShortcutBinding`.
 *
 * - bindings follow the order of the first render: a child after its parent, a later sibling after
 *   an earlier one, a later mount after everything before. The newest matching binding is the
 *   innermost one
 * - when `enabled` turns `true` after mounting, the bindings go after everything else, like a menu
 *   that opened over the page
 * - each render updates the bindings in place. A new function does not move its binding
 * - a new shortcut is added at the place of its component
 * - a shortcut that is no longer passed is removed
 */
export function useShortcuts(shortcuts: Record<string, ShortcutBinding["run"] | Omit<ShortcutBinding, "shortcut">>, enabled = true): void {
    const [rank] = useState(nextRank)
    const added = useRef<{ bindings: Map<string, ShortcutBinding>, enabled: boolean, rank: number }>(null)

    useLayoutEffect(() => {
        if (!added.current) added.current = { bindings: new Map(), enabled, rank }
        else if (enabled && !added.current.enabled) added.current.rank = nextRank()
        added.current.enabled = enabled
        const { bindings, rank: place } = added.current

        for (const [shortcut, binding] of bindings) {
            if (enabled && Object.hasOwn(shortcuts, shortcut)) continue
            Shortcut.bindings.delete(binding)
            bindings.delete(shortcut)
        }
        if (!enabled) return

        for (const [shortcut, value] of Object.entries(shortcuts)) {
            const fields = typeof value === "function" ? { run: value } : value
            const binding = bindings.get(shortcut)
            if (!binding) {
                const created = { ...fields, shortcut }
                bindings.set(shortcut, created)
                add(created, place)
                continue
            }
            // In place, for the binding to keep its place.
            for (const key of Object.keys(binding)) {
                if (key !== "shortcut" && !Object.hasOwn(fields, key)) Reflect.deleteProperty(binding, key)
            }
            Object.assign(binding, fields)
        }
    })

    useLayoutEffect(() => () => {
        for (const binding of added.current?.bindings.values() ?? []) Shortcut.bindings.delete(binding)
        added.current = null
    }, [])
}

/** Adds `binding` before the bindings of components that rank after it. */
function add(binding: ShortcutBinding, rank: number): void {
    ranks.set(binding, rank)
    const after = [...Shortcut.bindings].filter((other) => (ranks.get(other) ?? -1) > rank)
    for (const other of after) Shortcut.bindings.delete(other)
    Shortcut.bindings.add(binding)
    for (const other of after) Shortcut.bindings.add(other)
}
