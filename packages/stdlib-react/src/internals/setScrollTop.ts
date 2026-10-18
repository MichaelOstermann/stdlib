// A separate function: React Compiler skips a hook that assigns to a property of an element passed in.
export function setScrollTop(element: HTMLElement, top: number): void {
    element.scrollTop = top
}
