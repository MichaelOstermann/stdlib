import type { Result } from "./Result"
import { Err, Ok } from "./Result"

declare const brand: unique symbol

/**
 * A time-sorted ID: 13 characters that sort in the order they were created, such as
 * `"0ARYZ1J9QW5KD"`. Made by `TSID.create`, or checked by `TSID.parse`.
 *
 * Has the format of `tsid-ts`: 42 bits for the milliseconds since 2020, 10 bits for the process and
 * 12 for a counter, in Crockford's base 32.
 */
export type TSID = string & { readonly [brand]: "TSID" }

/** What `TSID.parse` fails with. */
export type TSIDError = { message: string, name: "TSIDError" }

const EPOCH = Date.UTC(2020, 0, 1)
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const COUNTER_BITS = 12
const COUNTER_SIZE = 2 ** COUNTER_BITS
const RANDOM_BITS = 22
const PATTERN = /^[0-9A-F][0-9A-HJKMNP-TV-Z]{12}$/

const node = randomBits(10)
let lastTime = 0
let counter = 0

/**
 * # create
 *
 * ```ts
 * TSID.create()
 * ```
 *
 * A new `TSID`, after every one this process created before it.
 *
 * ## Example
 *
 * ```ts
 * const id = TSID.create(); // "0ARYZ1J9QW5KD"
 * ```
 */
function create(): TSID {
    const now = Date.now()
    if (now > lastTime) {
        lastTime = now
        counter = randomBits(COUNTER_BITS)
    }
    else {
        counter++
        if (counter === COUNTER_SIZE) {
            lastTime++
            counter = 0
        }
    }
    return encode((BigInt(lastTime - EPOCH) << BigInt(RANDOM_BITS)) | BigInt(node * COUNTER_SIZE + counter))
}

/**
 * # parse
 *
 * ```ts
 * TSID.parse(value)
 * ```
 *
 * `value` as a `TSID`, or a `TSIDError` when it is none.
 *
 * ## Example
 *
 * ```ts
 * TSID.parse("0ARYZ1J9QW5KD"); // Ok("0ARYZ1J9QW5KD")
 * TSID.parse("abc"); // Err({ name: "TSIDError", message: `Invalid TSID "abc"` })
 * ```
 */
function parse(value: string): Result<TSID, TSIDError> {
    if (PATTERN.test(value)) return Ok(value as TSID)
    return Err<TSIDError>({ message: `Invalid TSID "${value}"`, name: "TSIDError" })
}

/**
 * # timestamp
 *
 * ```ts
 * TSID.timestamp(id)
 * ```
 *
 * When `id` was created, in milliseconds since 1970 like `Date.now()`.
 *
 * ## Example
 *
 * ```ts
 * new Date(TSID.timestamp(id));
 * ```
 */
function timestamp(id: TSID): number {
    return Number(decode(id) >> BigInt(RANDOM_BITS)) + EPOCH
}

function encode(value: bigint): TSID {
    let id = ""
    for (let shift = 60; shift >= 0; shift -= 5) id += ALPHABET[Number((value >> BigInt(shift)) & 31n)]
    return id as TSID
}

function decode(id: TSID): bigint {
    let value = 0n
    for (const char of id) value = (value << 5n) | BigInt(ALPHABET.indexOf(char))
    return value
}

function randomBits(bits: number): number {
    return crypto.getRandomValues(new Uint32Array(1))[0]! >>> (32 - bits)
}

export const TSID = {
    create,
    parse,
    timestamp,
}
