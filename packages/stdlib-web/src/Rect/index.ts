/* eslint-disable @typescript-eslint/no-redeclare -- Rect is a type and the functions that take it */
import { alignBottom } from "./alignBottom"
import { alignCenter } from "./alignCenter"
import { alignCenterX } from "./alignCenterX"
import { alignCenterY } from "./alignCenterY"
import { alignLeft } from "./alignLeft"
import { alignRight } from "./alignRight"
import { alignTop } from "./alignTop"
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
import { height } from "./height"
import { intersection } from "./intersection"
import { intersects } from "./intersects"
import { isEmpty } from "./isEmpty"
import { isEqual } from "./isEqual"
import { isOrigin } from "./isOrigin"
import { left } from "./left"
import { map } from "./map"
import { merge } from "./merge"
import { moveBottomTo } from "./moveBottomTo"
import { moveLeftTo } from "./moveLeftTo"
import { moveRightTo } from "./moveRightTo"
import { moveTopTo } from "./moveTopTo"
import { normalize } from "./normalize"
import { origin } from "./origin"
import { placeAboveBy } from "./placeAboveBy"
import { placeBelowBy } from "./placeBelowBy"
import { placeLeftOfBy } from "./placeLeftOfBy"
import { placeRightOfBy } from "./placeRightOfBy"
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
import { snapAbove } from "./snapAbove"
import { snapBelow } from "./snapBelow"
import { snapLeftOf } from "./snapLeftOf"
import { snapRightOf } from "./snapRightOf"
import { takeBottomPct } from "./takeBottomPct"
import { takeBottomPx } from "./takeBottomPx"
import { takeLeftPct } from "./takeLeftPct"
import { takeLeftPx } from "./takeLeftPx"
import { takeRightPct } from "./takeRightPct"
import { takeRightPx } from "./takeRightPx"
import { takeTopPct } from "./takeTopPct"
import { takeTopPx } from "./takeTopPx"
import { top } from "./top"
import { transform } from "./transform"
import { translate } from "./translate"
import { translateX } from "./translateX"
import { translateY } from "./translateY"
import { union } from "./union"
import { width } from "./width"

/** A rectangle by its position and size. Every function of `Rect` takes anything of this shape, a `DOMRect` included. */
export type Rect = {
    readonly height: number
    readonly left: number
    readonly top: number
    readonly width: number
}

export const Rect = {
    alignBottom,
    alignCenter,
    alignCenterX,
    alignCenterY,
    alignLeft,
    alignRight,
    alignTop,
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
    height,
    intersection,
    intersects,
    isEmpty,
    isEqual,
    isOrigin,
    left,
    map,
    merge,
    moveBottomTo,
    moveLeftTo,
    moveRightTo,
    moveTopTo,
    normalize,
    origin,
    placeAboveBy,
    placeBelowBy,
    placeLeftOfBy,
    placeRightOfBy,
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
    snapAbove,
    snapBelow,
    snapLeftOf,
    snapRightOf,
    takeBottomPct,
    takeBottomPx,
    takeLeftPct,
    takeLeftPx,
    takeRightPct,
    takeRightPx,
    takeTopPct,
    takeTopPx,
    top,
    transform,
    translate,
    translateX,
    translateY,
    union,
    width,
}
