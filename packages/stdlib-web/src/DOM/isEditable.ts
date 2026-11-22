/**
 * # isEditable
 *
 * Whether `target` accepts typing: an `<input>`, a `<textarea>`, a `<select>`, or a
 * `contenteditable` element. Use it to leave the keys of such an event to the field, not the page.
 *
 * ## Example
 *
 * ```ts
 * document.addEventListener("keydown", (event) => {
 *     if (event.key === "j" && !DOM.isEditable(event.target)) selectNext();
 * });
 * ```
 */
export function isEditable(target: EventTarget | null): boolean {
    const element = target as Partial<HTMLElement> | null
    return !!element && (element.isContentEditable === true || element.nodeName === "INPUT" || element.nodeName === "TEXTAREA" || element.nodeName === "SELECT")
}
