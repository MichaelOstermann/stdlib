/**
 * `_`
 *
 * Stands for anything, where something has to be written: a position of a tuple that `match` is not
 * asked to compare.
 *
 * ```ts
 * import { _, match } from "@monstermann/stdlib";
 *
 * match(["idle", "start"])
 *     .shape(["idle", _], "was idle")
 *     .unwrapOr("was busy"); // "was idle"
 * ```
 */
export const _: unique symbol = Symbol("_")
