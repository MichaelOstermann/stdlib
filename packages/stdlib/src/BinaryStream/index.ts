import { reader } from "./reader"
import { writer } from "./writer"

export namespace BinaryStream {
    /** Reads bytes from a `Uint8Array` or a `ReadableStream`, in pieces of the requested length. */
    export interface Reader {
        /** How many bytes were read so far. */
        readonly position: number
        /** Stops reading. A stream gets cancelled. */
        close: () => Promise<void>
        /**
         * Resolves with the next `length` bytes. Resolves with fewer bytes when the input ends
         * first, and with none after the end. The bytes are a view that is only valid until the
         * next read. Copy them to keep them.
         */
        read: (length: number) => Promise<Uint8Array>
    }
}

export const BinaryStream = {
    reader,
    writer,
}
