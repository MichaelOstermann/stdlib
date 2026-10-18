import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { afterAll, afterEach, beforeAll, beforeEach } from "bun:test"

export interface FakeElement {
    element: HTMLElement
    rect: { height: number, left: number, top: number, width: number }
}

/** What the fake observers have seen, reset before every test. */
export const dom = {
    intersecting: new Set<Element>(),
    resizing: new Map<Element, ResizeObserverCallback[]>(),
}

/** An element with the layout that happy-dom does not have: `getBoundingClientRect`, `offsetWidth` and `offsetHeight` follow `rect`. */
export function fakeElement(rect: FakeElement["rect"]): FakeElement {
    const fake = { element: document.createElement("div"), rect }
    Object.defineProperties(fake.element, {
        getBoundingClientRect: { writable: true, value: () => ({ ...fake.rect }) },
        offsetHeight: { get: () => fake.rect.height },
        offsetWidth: { get: () => fake.rect.width },
    })
    return fake
}

/** Reports the current size of an element to the resize observers that observe it. */
export function resize(fake: FakeElement): void {
    const entry = { borderBoxSize: [{ blockSize: fake.rect.height, inlineSize: fake.rect.width }], target: fake.element }
    for (const callback of dom.resizing.get(fake.element) ?? []) callback([entry as unknown as ResizeObserverEntry], undefined as never)
}

interface Viewport {
    devicePixelRatio?: number
    height?: number
    width?: number
}

/** Changes the size of the window, which sends `resize`, or its device pixel ratio. */
export function setViewport(viewport: Viewport): void {
    (window as unknown as { happyDOM: { setViewport: (viewport: Viewport) => void } }).happyDOM.setViewport(viewport)
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

/** happy-dom in the tests of this file, with observers that the tests drive: happy-dom has no layout to observe. */
export function fakeDOM(): void {
    beforeAll(() => GlobalRegistrator.register())
    afterAll(() => GlobalRegistrator.unregister())

    beforeEach(() => {
        dom.intersecting.clear()
        dom.resizing.clear()
        setViewport({ devicePixelRatio: 1, height: 600, width: 800 })
        Object.assign(globalThis, { IntersectionObserver: FakeIntersectionObserver, ResizeObserver: FakeResizeObserver })
    })

    afterEach(() => {
        document.body.replaceChildren()
    })
}
