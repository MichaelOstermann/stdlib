import { area } from "./area"
import { bottom } from "./bottom"
import { centerX } from "./centerX"
import { centerY } from "./centerY"
import { clamp } from "./clamp"
import { contain } from "./contain"
import { contains } from "./contains"
import { cover } from "./cover"
import { distance } from "./distance"
import { dropBottomPct } from "./dropBottomPct"
import { dropBottomPx } from "./dropBottomPx"
import { dropLeftPct } from "./dropLeftPct"
import { dropLeftPx } from "./dropLeftPx"
import { dropRightPct } from "./dropRightPct"
import { dropRightPx } from "./dropRightPx"
import { dropTopPct } from "./dropTopPct"
import { dropTopPx } from "./dropTopPx"
import { expand } from "./expand"
import { expandX } from "./expandX"
import { expandY } from "./expandY"
import { fromDOMRect } from "./fromDOMRect"
import { fromEdges } from "./fromEdges"
import { fromElement } from "./fromElement"
import { fromWindow } from "./fromWindow"
import { intersection } from "./intersection"
import { intersects } from "./intersects"
import { isEmpty } from "./isEmpty"
import { isEqual } from "./isEqual"
import { map } from "./map"
import { merge } from "./merge"
import { moveBottomTo } from "./moveBottomTo"
import { moveLeftTo } from "./moveLeftTo"
import { moveRightTo } from "./moveRightTo"
import { moveTopTo } from "./moveTopTo"
import { normalize } from "./normalize"
import { origin } from "./origin"
import { right } from "./right"
import { scale } from "./scale"
import { scaleX } from "./scaleX"
import { scaleY } from "./scaleY"
import { setBottom } from "./setBottom"
import { setCenter } from "./setCenter"
import { setCenterX } from "./setCenterX"
import { setCenterY } from "./setCenterY"
import { setHeight } from "./setHeight"
import { setLeft } from "./setLeft"
import { setRight } from "./setRight"
import { setTop } from "./setTop"
import { setWidth } from "./setWidth"
import { shrink } from "./shrink"
import { shrinkX } from "./shrinkX"
import { shrinkY } from "./shrinkY"
import { takeBottomPct } from "./takeBottomPct"
import { takeBottomPx } from "./takeBottomPx"
import { takeLeftPct } from "./takeLeftPct"
import { takeLeftPx } from "./takeLeftPx"
import { takeRightPct } from "./takeRightPct"
import { takeRightPx } from "./takeRightPx"
import { takeTopPct } from "./takeTopPct"
import { takeTopPx } from "./takeTopPx"
import { translate } from "./translate"
import { translateX } from "./translateX"
import { translateY } from "./translateY"
import { union } from "./union"

/**
 * A rectangle by its position and size. Every function of `Rect` takes anything of this shape, a
 * `DOMRect` included. A function that returns a rect returns the one it was given when nothing
 * changes.
 */
export type Rect = {
    readonly height: number
    readonly left: number
    readonly top: number
    readonly width: number
}

export const Rect = {
    area,
    bottom,
    centerX,
    centerY,
    clamp,
    contain,
    contains,
    cover,
    distance,
    dropBottomPct,
    dropBottomPx,
    dropLeftPct,
    dropLeftPx,
    dropRightPct,
    dropRightPx,
    dropTopPct,
    dropTopPx,
    expand,
    expandX,
    expandY,
    fromDOMRect,
    fromEdges,
    fromElement,
    fromWindow,
    intersection,
    intersects,
    isEmpty,
    isEqual,
    map,
    merge,
    moveBottomTo,
    moveLeftTo,
    moveRightTo,
    moveTopTo,
    normalize,
    origin,
    right,
    scale,
    scaleX,
    scaleY,
    setBottom,
    setCenter,
    setCenterX,
    setCenterY,
    setHeight,
    setLeft,
    setRight,
    setTop,
    setWidth,
    shrink,
    shrinkX,
    shrinkY,
    takeBottomPct,
    takeBottomPx,
    takeLeftPct,
    takeLeftPx,
    takeRightPct,
    takeRightPx,
    takeTopPct,
    takeTopPx,
    translate,
    translateX,
    translateY,
    union,
}
