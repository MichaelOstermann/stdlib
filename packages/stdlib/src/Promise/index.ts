import { replica } from "../internals/replica"
import { sleep } from "./sleep"

/**
 * The native `Promise`, with the functions of `@monstermann/stdlib` added: `Promise.sleep`, …
 *
 * `new Promise()`, `instanceof Promise` and the native members behave as they always do.
 */
export const Promise = replica(globalThis.Promise, {
    sleep,
})
