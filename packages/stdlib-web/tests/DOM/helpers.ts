import { afterEach, beforeEach } from "bun:test"

export interface FakeElement {
    element: Element
    rect: { height: number, left: number, top: number, width: number }
}

/** What the fake observers and the fake window have seen, reset before every test. */
export const dom = {
    intersecting: new Set<Element>(),
    listeners: new Set<() => void>(),
    resizing: new Map<Element, ResizeObserverCallback[]>(),
    window: { devicePixelRatio: 1, innerHeight: 600, innerWidth: 800 },
}

export function fakeElement(rect: FakeElement["rect"]): FakeElement {
    const fake = { rect } as FakeElement
    fake.element = { getBoundingClientRect: () => ({ ...fake.rect }) } as Element
    return fake
}

/** Reports the current size of an element to the resize observers that observe it. */
export function resize(fake: FakeElement): void {
    const entry = { borderBoxSize: [{ blockSize: fake.rect.height, inlineSize: fake.rect.width }], target: fake.element }
    for (const callback of dom.resizing.get(fake.element) ?? []) callback([entry as unknown as ResizeObserverEntry], undefined as never)
}

export function resizeWindow(innerWidth: number, innerHeight: number): void {
    Object.assign(dom.window, { innerHeight, innerWidth })
    for (const listener of dom.listeners) listener()
}

class FakeResizeObserver {
    observed = new Set<Element>()
    constructor(readonly callback: ResizeObserverCallback) {}

    disconnect(): void {
        for (const element of this.observed) this.unobserve(element)
    }

    observe(element: Element): void {
        if (this.observed.has(element)) return
        this.observed.add(element)
        dom.resizing.set(element, [...dom.resizing.get(element) ?? [], this.callback])
    }

    unobserve(element: Element): void {
        if (!this.observed.delete(element)) return
        const callbacks = dom.resizing.get(element)!.filter(callback => callback !== this.callback)
        if (callbacks.length) dom.resizing.set(element, callbacks)
        else dom.resizing.delete(element)
    }
}

class FakeIntersectionObserver {
    observed = new Set<Element>()

    disconnect(): void {
        for (const element of this.observed) dom.intersecting.delete(element)
        this.observed.clear()
    }

    observe(element: Element): void {
        this.observed.add(element)
        dom.intersecting.add(element)
    }
}

export function fakeDOM(): void {
    const globals = globalThis as { HTMLElement?: unknown, IntersectionObserver?: unknown, ResizeObserver?: unknown, window?: unknown }

    beforeEach(() => {
        dom.intersecting.clear()
        dom.listeners.clear()
        dom.resizing.clear()
        Object.assign(dom.window, { devicePixelRatio: 1, innerHeight: 600, innerWidth: 800 })
        // Only for `instanceof`: an element with `offsetWidth` is created from it, the others are plain objects.
        globals.HTMLElement = class {}
        globals.ResizeObserver = FakeResizeObserver
        globals.IntersectionObserver = FakeIntersectionObserver
        globals.window = Object.assign(dom.window, {
            addEventListener(_: string, listener: () => void, options: { signal: AbortSignal }) {
                dom.listeners.add(listener)
                options.signal.addEventListener("abort", () => dom.listeners.delete(listener))
            },
        })
    })

    afterEach(() => {
        delete globals.HTMLElement
        delete globals.ResizeObserver
        delete globals.IntersectionObserver
        delete globals.window
    })
}
