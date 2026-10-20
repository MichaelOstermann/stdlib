const entities: Record<string, string> = {
    '"': "&quot;",
    "&": "&amp;",
    "'": "&#39;",
    "<": "&lt;",
    ">": "&gt;",
}

/**
 * # escapeHTML
 *
 * ```ts
 * function String.escapeHTML(target: string): string
 * ```
 *
 * Replaces the characters of `target` string that mean something in HTML: `&`, `<`, `>`, `"` and `'`. The result is text, between tags and inside of a quoted attribute.
 *
 * ## Example
 *
 * ```ts
 * String.escapeHTML("<b>Tom & Jerry</b>"); // "&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;"
 * `<a title="${String.escapeHTML("\"quoted\"")}">`; // <a title="&quot;quoted&quot;">
 * ```
 *
 */
export function escapeHTML(target: string): string {
    return target.replace(/[&<>"']/g, (character) => entities[character]!)
}
