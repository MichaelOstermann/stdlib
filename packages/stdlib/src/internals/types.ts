/**
 * Mutable in, mutable out. Readonly in, readonly out. Without `U` the elements stay what they are,
 * for each member of a union of arrays on its own.
 */
export type Updated<T extends readonly unknown[], U = never> = T extends unknown[]
    ? ([U] extends [never] ? T[number] : U)[]
    : readonly ([U] extends [never] ? T[number] : U)[]

/**
 * Several values. A string is rejected: it is iterable, but passing one is never meant as a list of
 * characters.
 */
export type Values<T extends readonly unknown[], V extends Iterable<T[number]>> = V extends string ? never : V

/** What a predicate narrows to when it is a type guard, `T` otherwise. */
export type Narrowed<P, T> = P extends (value: any, ...args: any[]) => value is infer U ? U : T

/**
 * The element type of the second list of a partition: `T` without the type a type guard narrows to,
 * `T` otherwise.
 */
export type Excluded<P, T> = P extends (value: any, ...args: any[]) => value is infer U ? Exclude<T, U> : T

export type AnyMap = ReadonlyMap<any, any>
export type MapKey<T extends AnyMap> = T extends ReadonlyMap<infer K, any> ? K : never
export type MapValue<T extends AnyMap> = T extends ReadonlyMap<any, infer V> ? V : never

/** Mutable in, mutable out. Readonly in, readonly out. */
export type UpdatedMap<T extends AnyMap, V = MapValue<T>> = T extends Map<any, any> ? Map<MapKey<T>, V> : ReadonlyMap<MapKey<T>, V>

export type AnySet = ReadonlySet<any>
export type SetValue<T extends AnySet> = T extends ReadonlySet<infer V> ? V : never

/** Mutable in, mutable out. Readonly in, readonly out. */
export type UpdatedSet<T extends AnySet, V = SetValue<T>> = T extends Set<any> ? Set<V> : ReadonlySet<V>

/** Shows an intersection as the single object it is. */
export type Simplify<T> = { [K in keyof T]: T[K] } & {}
