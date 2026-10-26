/**
 * Makes `functions` available on `target`, which is never allowed to replace something that is
 * there already.
 */
export function define(target: object, name: string, functions: Record<string, unknown>): void {
    for (const key in functions) {
        const value = functions[key]
        if (key in target) {
            // Loaded twice, by the same copy of this package.
            if ((target as Record<string, unknown>)[key] === value) continue
            throw new Error(`@monstermann/stdlib: ${name}.${key} exists already, it has not been replaced.`)
        }
        Object.defineProperty(target, key, { configurable: true, enumerable: false, value, writable: false })
    }
}
