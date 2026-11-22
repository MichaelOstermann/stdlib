/** Shows an intersection as a single object. */
export type Simplify<T> = { [K in keyof T]: T[K] } & {}
