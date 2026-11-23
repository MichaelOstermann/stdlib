export class Matched {
    constructor(readonly value: unknown) {}

    case(): this {
        return this
    }

    cond(): this {
        return this
    }

    onCase(): this {
        return this
    }

    onCond(): this {
        return this
    }

    onShape(): this {
        return this
    }

    returnType(): this {
        return this
    }

    shape(): this {
        return this
    }

    unwrap(): unknown {
        return this.value
    }

    unwrapOr(): unknown {
        return this.value
    }

    unwrapOrElse(): unknown {
        return this.value
    }
}
