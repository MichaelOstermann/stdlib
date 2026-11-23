import { Matched } from "./Matched"
import { matches } from "./matches"
import { throwUnmatched } from "./throwUnmatched"

export class Unmatched {
    constructor(readonly value: unknown) {}

    case(...args: unknown[]): Matched | Unmatched {
        const last = args.length - 1
        for (let i = 0; i < last; i++) {
            if (this.value === args[i]) return new Matched(args[last])
        }
        return this
    }

    cond(predicate: (value: unknown) => boolean, result: unknown): Matched | Unmatched {
        if (!predicate(this.value)) return this
        return new Matched(result)
    }

    onCase(...args: unknown[]): Matched | Unmatched {
        // Taken out of the arguments to not be called as one of their methods.
        const fn = args.pop() as (value: unknown) => unknown
        for (const value of args) {
            if (this.value === value) return new Matched(fn(this.value))
        }
        return this
    }

    onCond(predicate: (value: unknown) => boolean, fn: (value: unknown) => unknown): Matched | Unmatched {
        if (!predicate(this.value)) return this
        return new Matched(fn(this.value))
    }

    onShape(...args: unknown[]): Matched | Unmatched {
        // Taken out of the arguments to not be called as one of their methods.
        const fn = args.pop() as (value: unknown) => unknown
        for (const pattern of args) {
            if (matches(this.value, pattern)) return new Matched(fn(this.value))
        }
        return this
    }

    returnType(): this {
        return this
    }

    shape(...args: unknown[]): Matched | Unmatched {
        const last = args.length - 1
        for (let i = 0; i < last; i++) {
            if (matches(this.value, args[i])) return new Matched(args[last])
        }
        return this
    }

    unwrap(): never {
        return throwUnmatched(this.value)
    }

    unwrapOr(value: unknown): unknown {
        return value
    }

    unwrapOrElse(fn: (value: unknown) => unknown): unknown {
        return fn(this.value)
    }
}
