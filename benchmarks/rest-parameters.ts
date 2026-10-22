import { bench } from "./bench"

// A rest parameter against arguments.length: a getter and setter in one function like a signal, and a pipe that takes its steps either way.

let value = 0

function signalWithRest(...args: number[]): number | void {
    if (args.length === 0) return value
    value = args[0]!
}

function signalWithArguments(next?: number): number | void {
    if (arguments.length === 0) return value
    value = next!
}

function pipeWithRest(value: number, ...steps: ((value: number) => number)[]): number {
    return steps.reduce((value, step) => step(value), value)
}

function pipeWithRestAndLoop(value: number, ...steps: ((value: number) => number)[]): number {
    for (const step of steps) value = step(value)
    return value
}

function pipeWithParameters(value: number, ab?: (value: number) => number, bc?: (value: number) => number, cd?: (value: number) => number): number {
    switch (arguments.length) {
        case 1: return value
        case 2: return ab!(value)
        case 3: return bc!(ab!(value))
        default: return cd!(bc!(ab!(value)))
    }
}

const increment = (value: number): number => value + 1
const double = (value: number): number => value * 2
const decrement = (value: number): number => value - 3

bench("read, rest parameter", 0, () => signalWithRest())
bench("read, arguments.length", 0, () => signalWithArguments())
bench("write, rest parameter", 1, (next) => signalWithRest(next))
bench("write, arguments.length", 1, (next) => signalWithArguments(next))
bench("pipe, rest parameter", 1, (value) => pipeWithRest(value, increment, double, decrement))
bench("pipe, rest parameter and a loop", 1, (value) => pipeWithRestAndLoop(value, increment, double, decrement))
bench("pipe, parameters", 1, (value) => pipeWithParameters(value, increment, double, decrement))
