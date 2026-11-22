/** Returns the keys that `{ ...value }` copies: the own enumerable keys, symbols included. */
export function ownKeys(value: object): PropertyKey[] {
    const keys: PropertyKey[] = Object.keys(value)
    for (const symbol of Object.getOwnPropertySymbols(value)) {
        if (Object.prototype.propertyIsEnumerable.call(value, symbol)) keys.push(symbol)
    }
    return keys
}

/** Defines the property instead of assigning it, so `"__proto__"` is a key like any other. */
export function setOwn(target: object, key: PropertyKey, value: unknown): void {
    Object.defineProperty(target, key, { configurable: true, enumerable: true, value, writable: true })
}
