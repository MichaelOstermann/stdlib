export interface Timer {
    /** When the callback is due, a restart only moves it instead of setting a timeout again. */
    due: number
    tid: ReturnType<typeof setTimeout> | undefined
    timeout: number
    callback: () => void
}

type Timers = Timer | Set<Timer>

export function createTimer(timeout: number, callback: () => void): Timer {
    return {
        callback,
        due: 0,
        tid: undefined,
        timeout,
    }
}

export function clearTimer(timer: Timers): void {
    if (timer instanceof Set) {
        for (const t of timer) clearTimer(t)
        return
    }
    if (timer.timeout < 0) return
    clearTimeout(timer.tid)
    timer.tid = undefined
}

export function startTimer(timer: Timers): void {
    if (timer instanceof Set) {
        for (const t of timer) startTimer(t)
        return
    }
    if (timer.timeout < 0) return
    if (timer.tid != null) return
    timer.due = performance.now() + timer.timeout
    arm(timer, timer.timeout)
}

export function restartTimer(timer: Timers): void {
    if (timer instanceof Set) {
        for (const t of timer) restartTimer(t)
        return
    }
    if (timer.timeout < 0) return
    timer.due = performance.now() + timer.timeout
    if (timer.tid == null) arm(timer, timer.timeout)
}

function arm(timer: Timer, delay: number): void {
    timer.tid = setTimeout(() => {
        // Restarted in the meantime: waits for what is left.
        const left = timer.due - performance.now()
        if (left > 0) return arm(timer, left)
        timer.tid = undefined
        timer.callback()
    }, delay)
}
