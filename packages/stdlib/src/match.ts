import type { MatchTag } from "./internals/match/tag"
import type { Matcher } from "./internals/match/types/Matcher"
import { _ } from "./_"
import { tag } from "./internals/match/tag"
import { Unmatched } from "./internals/match/Unmatched"

export interface Match {
    /**
     * `match(value)`
     *
     * Matches a value, returning the result of the first branch that applies.
     *
     * - `.case(...values, result)` compares with `===`, and returns `result`
     * - `.shape(...patterns, result)` compares objects field by field, and tuples position by position, `_` standing for any value
     * - `.cond(predicate, result)` asks a function
     * - `.onCase(...values, fn)`, `.onShape(...patterns, fn)` and `.onCond(predicate, fn)` return what `fn` returns for the value
     * - `.unwrap()` ends a chain that covers every case, and throws for a value that the types did not tell about
     * - `.unwrapOr(result)` and `.unwrapOrElse(fn)` end a chain with a fallback
     * - `.returnType<T>()` asks every result to be a `T`
     *
     * ```ts
     * import { _, match } from "@monstermann/stdlib";
     *
     * type Message = { type: "text"; value: string } | { type: "ping" } | null;
     *
     * const describe = (message: Message) =>
     *     match(message)
     *         .case(null, "nothing")
     *         .shape({ type: "ping" }, "ping")
     *         .onShape({ type: "text" }, (message) => message.value)
     *         .unwrap();
     *
     * describe({ type: "text", value: "hello" }); // "hello"
     *
     * const next = (state: "idle" | "busy", event: "start" | "stop") =>
     *     match([state, event])
     *         .shape(["idle", "start"], "busy")
     *         .shape(["busy", "stop"], "idle")
     *         .onShape([_, _], ([state]) => state)
     *         .unwrap();
     *
     * next("idle", "start"); // "busy"
     * ```
     */
    <const T>(value: T): Matcher<T>
    /** Matches anything at a position of a tuple, the same as `_`. */
    readonly _: typeof _
    readonly tag: MatchTag
}

export const match = function (value: unknown) {
    return new Unmatched(value)
} as unknown as Match

// The semicolon keeps this from being parsed as a call of the expression above, once the types are gone.
;(match as { _: unknown })._ = _
;(match as { tag: unknown }).tag = tag
