/** Shows an intersection as the single object it is. */
export type Simplify<T> = { [K in keyof T]: T[K] } & {}
