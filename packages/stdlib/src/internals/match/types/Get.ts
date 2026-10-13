// A key read from a record may be missing, so its type includes `undefined`.
export type Get<T, K> = K extends keyof T
    ? string extends keyof T ? T[K] | undefined : T[K]
    : undefined
