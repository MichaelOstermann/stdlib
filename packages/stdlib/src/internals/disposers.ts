import type { Disposer } from "../Disposer"

// Registered globally, so multiple copies of this package recognize each others disposers.
export const brand: unique symbol = Symbol.for("@monstermann/stdlib/Disposer") as never

/**
 * Makes `target` something that has a disposer, without creating one: `node` is called when it is added to a disposer,
 * which is then able to remove it once it is disposed by itself.
 */
export function holdDisposer(target: object, node: () => Disposer): void {
    (target as { [brand]: () => Disposer })[brand] = node
}
