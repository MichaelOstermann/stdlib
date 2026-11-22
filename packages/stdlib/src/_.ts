/**
 * `_`
 *
 * Stands for any value. Use it in a tuple pattern of `match` for a position that should not be
 * compared.
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
