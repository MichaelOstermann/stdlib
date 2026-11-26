let listeners = 0

/**
 * Puts stdin into raw mode and starts reading it. Returns a function that undoes this once every
 * caller has called its own.
 */
export function acquireRawInput(): () => void {
    if (listeners === 0) {
        process.stdin.setRawMode(true)
        process.stdin.resume()
    }
    listeners++
    let released = false
    return () => {
        if (released) return
        released = true
        listeners--
        if (listeners > 0) return
        process.stdin.setRawMode(false)
        process.stdin.pause()
    }
}
