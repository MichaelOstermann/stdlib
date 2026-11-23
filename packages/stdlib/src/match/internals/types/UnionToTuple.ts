// Taken from type-fest@6.0.3, MIT License, Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
import type { IsEqual } from "./IsEqual"

/** The members of a union, in no particular order. */
export type UnionToTuple<Union, Tuple extends unknown[] = [], Member = UnionMember<Union>> = [Union] extends [never]
    ? Tuple
    : UnionToTuple<Union extends unknown ? IsEqual<Union, Member> extends true ? never : Union : never, [Member, ...Tuple]>

type UnionMember<T> = [T] extends [never]
    ? never
    : (T extends unknown ? (member: () => T) => void : never) extends (member: infer Intersection) => void
        ? Intersection extends () => infer Member
            ? Member
            : never
        : never
