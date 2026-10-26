import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { afterAll, afterEach, beforeAll, beforeEach } from "bun:test"

export interface FakeElement {
    element: HTMLElement
    rect: { height: number, left: number, top: number, width: number }
}

/** What the fake observers have seen, reset before every test. */
export const dom = {
    intersecting: new Set<Element>(),
    intersections: new Map<Element, { callback: IntersectionObserverCallback, options: IntersectionObserverInit }>(),
    resizing: new Map<Element, ResizeObserverCallback[]>(),
}

/**
 * An element with the layout that happy-dom does not have: `getBoundingClientRect`, `offsetWidth`
 * and `offsetHeight` follow `rect`.
 */
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
        const callbacks = dom.resizing.get(element)!.filter((callback) => callback !== this.callback)
        if (callbacks.length) dom.resizing.set(element, callbacks)
        else dom.resizing.delete(element)
    }
}

class FakeIntersectionObserver {
    observed = new Set<Element>()
    constructor(readonly callback: IntersectionObserverCallback, readonly options: IntersectionObserverInit) {}

    disconnect(): void {
        for (const element of this.observed) {
            dom.intersecting.delete(element)
            dom.intersections.delete(element)
        }
        this.observed.clear()
    }

    observe(element: Element): void {
        this.observed.add(element)
        dom.intersecting.add(element)
        dom.intersections.set(element, this)
    }
}

/** Reports `ratio` of an element to the intersection observer that observes it. */
export function intersect(fake: FakeElement, ratio: number): void {
    const observer = dom.intersections.get(fake.element)!
    const entry = { intersectionRatio: ratio, target: fake.element }
    observer.callback([entry as unknown as IntersectionObserverEntry], observer as unknown as IntersectionObserver)
}

/**
 * happy-dom in the tests of this file, with observers that the tests drive: happy-dom has no layout
 * to observe.
 */
export function fakeDOM(): void {
    beforeAll(() => GlobalRegistrator.register())
    afterAll(() => GlobalRegistrator.unregister())

    beforeEach(() => {
        dom.intersecting.clear()
        dom.intersections.clear()
        dom.resizing.clear()
        setViewport({ devicePixelRatio: 1, height: 600, width: 800 })
        Object.assign(globalThis, { IntersectionObserver: FakeIntersectionObserver, ResizeObserver: FakeResizeObserver })
    })

    afterEach(() => {
        document.body.replaceChildren()
    })
}

/** Animation frames that the tests run, at the time they choose. */
export const frames = {
    callbacks: new Map<number, FrameRequestCallback>(),
    id: 0,
    now: 0,
    /** Moves the time ahead by `ms` and runs the frames that were requested until then. */
    run(ms = 16): void {
        this.now += ms
        const callbacks = [...this.callbacks.values()]
        this.callbacks.clear()
        for (const callback of callbacks) callback(this.now)
    },
}

/** `requestAnimationFrame` and `performance.now` driven by `frames`, in the tests of this file. */
export function fakeFrames(): void {
    let original: { cancelAnimationFrame: typeof cancelAnimationFrame, now: typeof performance.now, requestAnimationFrame: typeof requestAnimationFrame }

    beforeEach(() => {
        original = { cancelAnimationFrame, now: performance.now, requestAnimationFrame }
        frames.callbacks.clear()
        frames.now = 0
        globalThis.requestAnimationFrame = (callback) => {
            frames.callbacks.set(++frames.id, callback)
            return frames.id
        }
        globalThis.cancelAnimationFrame = (id) => frames.callbacks.delete(id)
        performance.now = () => frames.now
    })

    afterEach(() => {
        Object.assign(globalThis, { cancelAnimationFrame: original.cancelAnimationFrame, requestAnimationFrame: original.requestAnimationFrame })
        performance.now = original.now
    })
}

/** An element that can scroll by `width` and `height` more than it shows. */
export function scrollable(element: HTMLElement, { height = 0, width = 0 }: { height?: number, width?: number }): HTMLElement {
    let left = 0
    let top = 0
    Object.defineProperties(element, {
        clientHeight: { value: 100 },
        clientWidth: { value: 100 },
        scrollBy: { value: (x: number, y: number) => Object.assign(element, { scrollLeft: left + x, scrollTop: top + y }) },
        scrollHeight: { value: 100 + height },
        scrollLeft: { get: () => left, set: (value) => left = Math.min(Math.max(0, value), width) },
        scrollTop: { get: () => top, set: (value) => top = Math.min(Math.max(0, value), height) },
        scrollWidth: { value: 100 + width },
    })
    return element
}
