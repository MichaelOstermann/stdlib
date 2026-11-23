export type AnySet = ReadonlySet<any>
export type SetValue<T extends AnySet> = T extends ReadonlySet<infer V> ? V : never

/** Mutable in, mutable out. Readonly in, readonly out. */
export type UpdatedSet<T extends AnySet, V = SetValue<T>> = T extends Set<any> ? Set<V> : ReadonlySet<V>
