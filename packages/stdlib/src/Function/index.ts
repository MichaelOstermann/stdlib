import { replica } from "../internals/replica"
import { debounce } from "./debounce"
import { middleware } from "./middleware"
import { noop } from "./noop"
import { once } from "./once"
import { throttle } from "./throttle"

/**
 * The native `Function`, with the functions of `@monstermann/stdlib` added: `Function.debounce`, …
 *
 * `Function.prototype` and the native members behave as they always do.
 */
export const Function = replica(globalThis.Function, {
    debounce,
    middleware,
    noop,
    once,
    throttle,
})
