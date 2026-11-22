import { replica } from "../internals/replica"
import { chunk } from "./chunk"
import { concat } from "./concat"
import { dropWhile } from "./dropWhile"
import { filter } from "./filter"
import { isShallowEqual } from "./isShallowEqual"
import { map } from "./map"
import { mapAt } from "./mapAt"
import { mapFirstWhere } from "./mapFirstWhere"
import { mapLastWhere } from "./mapLastWhere"
import { mapWhere } from "./mapWhere"
import { maxBy } from "./maxBy"
import { minBy } from "./minBy"
import { partition } from "./partition"
import { removeAll } from "./removeAll"
import { removeAt } from "./removeAt"
import { removeFirst } from "./removeFirst"
import { removeFirstWhere } from "./removeFirstWhere"
import { removeLast } from "./removeLast"
import { removeLastWhere } from "./removeLastWhere"
import { removeWhere } from "./removeWhere"
import { replaceFirst } from "./replaceFirst"
import { replaceFirstWhere } from "./replaceFirstWhere"
import { replaceLast } from "./replaceLast"
import { replaceLastWhere } from "./replaceLastWhere"
import { sample } from "./sample"
import { setAt } from "./setAt"
import { shuffle } from "./shuffle"
import { sortBy } from "./sortBy"
import { sortByLocale } from "./sortByLocale"
import { takeWhile } from "./takeWhile"
import { unique } from "./unique"
import { uniqueBy } from "./uniqueBy"

/**
 * The native `Array`, with the functions of `@monstermann/stdlib` added: `Array.removeAll`, …
 *
 * `Array.from()`, `Array.isArray()` and the native members behave as they always do.
 */
export const Array = replica(globalThis.Array, {
    chunk,
    concat,
    dropWhile,
    filter,
    isShallowEqual,
    map,
    mapAt,
    mapFirstWhere,
    mapLastWhere,
    mapWhere,
    maxBy,
    minBy,
    partition,
    removeAll,
    removeAt,
    removeFirst,
    removeFirstWhere,
    removeLast,
    removeLastWhere,
    removeWhere,
    replaceFirst,
    replaceFirstWhere,
    replaceLast,
    replaceLastWhere,
    sample,
    setAt,
    shuffle,
    sortBy,
    sortByLocale,
    takeWhile,
    unique,
    uniqueBy,
})
