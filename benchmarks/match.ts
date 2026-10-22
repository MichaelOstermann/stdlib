import { match as uncompiled } from "../packages/stdlib/src/match"
import { measure } from "./measure"
import "@monstermann/stdlib/globals"

// The example of the performance page, compiled by stdlib-transform and as it is written.

type Shape =
    | { kind: "circle", radius: number }
    | { kind: "square", size: number }

const values: (Shape | null)[] = [null, { kind: "circle", radius: 1 }, { kind: "square", size: 2 }]

// `match` is the global: compiled.
function compiled(value: Shape | null): string {
    return match(value)
        .case(null, "Nothing")
        .shape({ kind: "circle" }, "A circle")
        .shape({ kind: "square" }, "A square")
        .unwrap()
}

// `match` is imported from the sources: left as it is.
function asWritten(value: Shape | null): string {
    return uncompiled(value)
        .case(null, "Nothing")
        .shape({ kind: "circle" }, "A circle")
        .shape({ kind: "square" }, "A square")
        .unwrap()
}

measure({
    "without stdlib-transform": (calls) => {
        let result
        for (let i = 0; i < calls; i++) result = asWritten(values[i % 3]!)
        return result
    },
    "with stdlib-transform": (calls) => {
        let result
        for (let i = 0; i < calls; i++) result = compiled(values[i % 3]!)
        return result
    },
})
