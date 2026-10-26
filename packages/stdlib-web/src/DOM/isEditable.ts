/**
 * # isEditable
 *
 * ```ts
 * function DOM.isEditable(target: EventTarget | null): boolean
 * ```
 *
 * Whether `target` takes what is typed: an `<input>`, a `<textarea>`, a `<select>`, or what is
 * `contenteditable`. For an event whose keys belong to the field and not to the page.
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
