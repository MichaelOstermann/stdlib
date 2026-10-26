/**
 * # dedent
 *
 * ```ts
 * function String.dedent(target: string): string
 * function String.dedent(strings: TemplateStringsArray, ...values: unknown[]): string
 * ```
 *
 * Removes the indentation that all lines of `target` string have in common, together with a first
 * and a last line that are blank. Blank lines in between do not count.
 *
 * As a tag of a template, values are not looked at for indentation, and the lines of a value are
 * indented like the line it is placed on.
 *
 * ## Example
 *
 * ```ts
 * String.dedent("    a\\n      b"); // "a\\n  b"
 *
 * String.dedent(`
 *     if (ready) {
 *         run();
 *     }
 * `); // "if (ready) {\n    run();\n}"
 *
 * const body = "one();\ntwo();";
 *
 * String.dedent`
 *     function run() {
 *         ${body}
 *     }
 * `; // "function run() {\n    one();\n    two();\n}"
 * ```
 */
export function dedent(target: string): string
export function dedent(strings: TemplateStringsArray, ...values: unknown[]): string
export function dedent(target: string | TemplateStringsArray, ...values: unknown[]): string {
    const strings = typeof target === "string" ? [target] : target
    const chunks = strings.map((string) => string.split("\n"))

    // Every line but the first one of a string starts a line, the very first one does as well.
    let indent = Infinity
    for (let i = 0; i < chunks.length; i++) {
        const lines = chunks[i]!
        for (let j = i === 0 ? 0 : 1; j < lines.length; j++) {
            const line = lines[j]!
            const length = line.length - line.trimStart().length
            // A line of nothing but whitespace is blank, unless a value follows on it.
            const isBlank = length === line.length && (j < lines.length - 1 || i === chunks.length - 1)
            if (!isBlank && length < indent) indent = length
        }
    }

    let result = ""
    for (let i = 0; i < chunks.length; i++) {
        const lines = chunks[i]!
        for (let j = 0; j < lines.length; j++) {
            const line = lines[j]!
            if (j > 0) result += "\n"
            if (j === 0 && i > 0) result += line
            else result += line.slice(Math.min(indent, line.length - line.trimStart().length))
        }

        if (i < values.length) {
            const value = String(values[i])
            const start = result.lastIndexOf("\n") + 1
            const current = result.slice(start, result.length - result.slice(start).trimStart().length)
            result += current ? value.replaceAll("\n", `\n${current}`) : value
        }
    }

    return result.replace(/^[ \t]*\r?\n/, "").replace(/\r?\n[ \t]*$/, "")
}
