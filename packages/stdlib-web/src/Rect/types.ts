/** A rectangle by its position and size. Every function of `Rect` takes anything of this shape, a `DOMRect` included. */
export type Rect = {
    readonly height: number
    readonly left: number
    readonly top: number
    readonly width: number
}
