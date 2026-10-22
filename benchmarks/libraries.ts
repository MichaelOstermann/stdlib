import type { Case } from "./measure"
import { produce } from "immer"
import { create } from "mutative"
import { map as remedaMap, setPath as remedaSetPath } from "remeda"
import { setPath as uncompiledSetPath } from "../packages/stdlib/src/Object/setPath"
import { measure } from "./measure"
import "@monstermann/stdlib/globals"

// stdlib against remeda, immer and mutative, as on the performance page.

const cases: Record<string, Case> = {}

// Mapping over an array, each library assigning each item.
for (const size of [10, 1000]) {
    // Two equal inputs, taken in turns: with one, an engine may see that every call returns the same, and make it once.
    const inputs = [Array.from({ length: size }, (_, i) => i), Array.from({ length: size }, (_, i) => i)]
    const changes: Record<string, (value: number) => number> = {
        "nothing changed": (value) => value,
        "something changed": (value) => value === size - 1 ? -1 : value,
    }
    for (const [change, fn] of Object.entries(changes)) {
        const recipe = (draft: number[]): void => {
            for (let i = 0; i < draft.length; i++) draft[i] = fn(draft[i]!)
        }
        cases[`map, ${size} items, ${change}, stdlib`] = (calls) => {
            let result
            for (let i = 0; i < calls; i++) result = Array.map(inputs[i & 1]!, fn)
            return result
        }
        cases[`map, ${size} items, ${change}, remeda`] = (calls) => {
            let result
            for (let i = 0; i < calls; i++) result = remedaMap(inputs[i & 1]!, fn)
            return result
        }
        cases[`map, ${size} items, ${change}, immer`] = (calls) => {
            let result
            for (let i = 0; i < calls; i++) result = produce(inputs[i & 1]!, recipe)
            return result
        }
        cases[`map, ${size} items, ${change}, mutative`] = (calls) => {
            let result
            for (let i = 0; i < calls; i++) result = create(inputs[i & 1]!, recipe)
            return result
        }
    }
}

// Setting state.user.settings.theme.
function createState() {
    return {
        filters: { query: "", sort: "date", status: "all" },
        tasks: Array.from({ length: 100 }, (_, i) => ({ done: false, id: i, tags: ["a", "b"], title: `Task ${i}` })),
        ui: { loading: false, modal: null, toast: null },
        user: {
            email: "ada@example.com",
            id: 1,
            name: "Ada",
            settings: { density: "compact", fontSize: 14, locale: "en", notifications: true, sidebar: true, sounds: false, theme: "light" as "dark" | "light", timezone: "UTC" },
        },
    }
}

// Two equal states, taken in turns, as above.
const states = [createState(), createState()]

for (const [change, theme] of [["nothing changed", "light"], ["something changed", "dark"]] as const) {
    // `Object` is the global and the path is written out: compiled.
    cases[`setPath, ${change}, stdlib`] = (calls) => {
        let result
        for (let i = 0; i < calls; i++) result = Object.setPath(states[i & 1]!, "user.settings.theme", theme)
        return result
    }
    cases[`setPath, ${change}, stdlib without stdlib-transform`] = (calls) => {
        let result
        for (let i = 0; i < calls; i++) result = uncompiledSetPath(states[i & 1]!, "user.settings.theme", theme)
        return result
    }
    cases[`setPath, ${change}, stdlib Object.set three times`] = (calls) => {
        let result
        for (let i = 0; i < calls; i++) {
            const state = states[i & 1]!
            result = Object.set(state, "user", Object.set(state.user, "settings", Object.set(state.user.settings, "theme", theme)))
        }
        return result
    }
    cases[`setPath, ${change}, remeda`] = (calls) => {
        let result
        for (let i = 0; i < calls; i++) result = remedaSetPath(states[i & 1]!, ["user", "settings", "theme"], theme)
        return result
    }
    cases[`setPath, ${change}, immer`] = (calls) => {
        let result
        for (let i = 0; i < calls; i++) result = produce(states[i & 1]!, (draft) => void (draft.user.settings.theme = theme))
        return result
    }
    cases[`setPath, ${change}, mutative`] = (calls) => {
        let result
        for (let i = 0; i < calls; i++) result = create(states[i & 1]!, (draft) => void (draft.user.settings.theme = theme))
        return result
    }
}

measure(cases)
