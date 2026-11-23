// Taken from type-fest@6.0.3, MIT License, Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

export type IsEqual<A, B> = [A] extends [B]
    ? [B] extends [A]
        ? (<G>() => G extends A & G | G ? 1 : 2) extends (<G>() => G extends B & G | G ? 1 : 2)
            ? true
            : false
        : false
    : false
