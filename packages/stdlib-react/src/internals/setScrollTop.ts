// Its own function: React Compiler skips a hook that writes to an element it was passed.
export function setScrollTop(element: HTMLElement, top: number): void {
    element.scrollTop = top
}
