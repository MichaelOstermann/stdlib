export type AnyMap = ReadonlyMap<any, any>
export type MapKey<T extends AnyMap> = T extends ReadonlyMap<infer K, any> ? K : never
export type MapValue<T extends AnyMap> = T extends ReadonlyMap<any, infer V> ? V : never

/** Mutable in, mutable out. Readonly in, readonly out. */
export type UpdatedMap<T extends AnyMap, V = MapValue<T>> = T extends Map<any, any> ? Map<MapKey<T>, V> : ReadonlyMap<MapKey<T>, V>
