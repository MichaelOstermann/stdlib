const cleanups = new Set<() => void>()

const EXIT_CODES = { SIGINT: 130, SIGTERM: 143 } as const

/**
 * Runs `cleanup` when the process exits or gets SIGINT or SIGTERM, newest first. After a signal,
 * exits like the signal would, unless the program listens for the signal too and decides itself.
 * Returns a function that runs `cleanup` right away, at most once.
 */
export function onTerminalCleanup(cleanup: () => void): () => void {
    let done = false
    const run = (): void => {
        if (done) return
        done = true
        cleanups.delete(run)
        if (!cleanups.size) unlisten()
        cleanup()
    }
    if (!cleanups.size) listen()
    cleanups.add(run)
    return run
}

function listen(): void {
    process.on("exit", runAll)
    process.prependListener("SIGINT", onSignal)
    process.prependListener("SIGTERM", onSignal)
}

function unlisten(): void {
    process.off("exit", runAll)
    process.off("SIGINT", onSignal)
    process.off("SIGTERM", onSignal)
}

function runAll(): void {
    for (const cleanup of [...cleanups].toReversed()) cleanup()
}

function onSignal(signal: "SIGINT" | "SIGTERM"): void {
    const othersListen = process.listenerCount(signal) > 1
    runAll()
    if (!othersListen) process.exit(EXIT_CODES[signal])
}
