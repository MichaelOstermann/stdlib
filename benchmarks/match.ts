import { match as tsPattern } from "ts-pattern"
import { bench } from "./bench"
import "@monstermann/stdlib/globals"

// The example of the performance page: compiled into conditions with --transform, a chain of calls without, and ts-pattern.

type Shape =
    | { kind: "circle", radius: number }
    | { kind: "square", size: number }

const circle = { kind: "circle", radius: 1 } as Shape | null

bench("stdlib", circle, (value) => match(value)
    .case(null, "Nothing")
    .shape({ kind: "circle" }, "A circle")
    .shape({ kind: "square" }, "A square")
    .unwrap())

bench("ts-pattern", circle, (value) => tsPattern(value)
    .with(null, () => "Nothing")
    .with({ kind: "circle" }, () => "A circle")
    .with({ kind: "square" }, () => "A square")
    .exhaustive())
