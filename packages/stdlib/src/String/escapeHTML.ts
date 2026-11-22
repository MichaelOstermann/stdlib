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
 * Escapes the characters of `target` that mean something in HTML: `&`, `<`, `>`, `"` and `'`. The
 * result is safe as text between tags and inside a quoted attribute.
 *
 * ## Example
 *
 * ```ts
 * String.escapeHTML("<b>Tom & Jerry</b>"); // "&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;"
 * `<a title="${String.escapeHTML("\"quoted\"")}">`; // <a title="&quot;quoted&quot;">
 * ```
 */
export function escapeHTML(target: string): string {
    return target.replace(/[&<>"']/g, (character) => entities[character]!)
}
