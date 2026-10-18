import { aligned } from "./aligned"
import { interval } from "./interval"
import { timeout } from "./timeout"

export interface TimerOptions {
    /** Lets the process exit while the timer is pending, where timers have `unref`: Node, Bun and Deno. Browsers have nothing to keep alive. */
    unref?: boolean
}

export const Timer = {
    aligned,
    interval,
    timeout,
}
