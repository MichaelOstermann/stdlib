import { replica } from "../internals/replica"
import { chunk } from "./chunk"
import { filter } from "./filter"
import { isShallowEqual } from "./isShallowEqual"
import { map } from "./map"
import { mapFirstWhere } from "./mapFirstWhere"
import { mapLastWhere } from "./mapLastWhere"
import { mapWhere } from "./mapWhere"
import { maxBy } from "./maxBy"
import { minBy } from "./minBy"
import { partition } from "./partition"
import { removeAll } from "./removeAll"
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
import { shuffle } from "./shuffle"
import { sortBy } from "./sortBy"
import { sortByLocale } from "./sortByLocale"
import { unique } from "./unique"
import { uniqueBy } from "./uniqueBy"

/**
 * The native `Array`, with the functions of `@monstermann/stdlib` added: `Array.removeAll`, …
 *
 * `Array.from()`, `Array.isArray()` and the native members behave as they always do.
 */
export const Array = replica(globalThis.Array, {
    chunk,
    filter,
    isShallowEqual,
    map,
    mapFirstWhere,
    mapLastWhere,
    mapWhere,
    maxBy,
    minBy,
    partition,
    removeAll,
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
    shuffle,
    sortBy,
    sortByLocale,
    unique,
    uniqueBy,
})
