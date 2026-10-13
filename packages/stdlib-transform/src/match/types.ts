import type MagicString from "magic-string"
import type { Node } from "oxc-parser"

/** Runtime helpers that compiled code calls, by the local names they are imported as. */
export interface Helpers {
    matches?: string
    throwUnmatched?: string
}

export interface Context {
    code: string
    filePath: string
    helpers: Helpers
    ids: Set<string>
    /** The name `match` has been imported as. */
    match: string
    ms: MagicString
    /** How many references to each import have been compiled away, by exported name. */
    used: { _: number, match: number }
    /** The name `_` has been imported as, when it has been. */
    wildcard: string | undefined
    /** The name a helper is imported as. */
    helper: (name: keyof Helpers) => string
    id: (base: string) => string
    /** Whether a name refers to the import at the place it is used, and is not shadowed by a local of the same name. */
    isImport: (name: string) => boolean
    /** Whether a name always refers to the same value: a `const`, or something that nothing in the file assigns to. */
    isStable: (name: string) => boolean
}

/** The matched subject: one value, or the values of `match([a, b])`, which are matched one by one without building the array. */
export type Subject =
    | { kind: "value", name: string }
    | { kind: "tuple", names: string[] }

export interface Step {
    args: Node[]
    name: "case" | "cond" | "onCase" | "onCond" | "onShape" | "shape" | "unwrap" | "unwrapOr" | "unwrapOrElse"
}

export interface Chain {
    steps: Step[]
    subject: Node
}
