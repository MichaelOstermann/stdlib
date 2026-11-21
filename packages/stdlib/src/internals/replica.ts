/**
 * `native` with `members` added, without changing `native` itself: `new`, `instanceof` and its own
 * members still behave like `native`.
 */
export function replica<N extends object, M extends object>(native: N, members: M): N & M {
    return new Proxy(native, {
        get: (target, key, receiver) => Object.hasOwn(members, key) ? members[key as keyof M] : Reflect.get(target, key, receiver),
    }) as N & M
}
