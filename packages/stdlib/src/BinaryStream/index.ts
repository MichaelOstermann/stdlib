import { reader } from "./reader"
import { writer } from "./writer"

export namespace BinaryStream {
    /** Reads bytes from a `Uint8Array` or a `ReadableStream` in pieces of the length asked for. */
    export interface Reader {
        /** How many bytes were read so far. */
        readonly position: number
        /** Stops reading, a stream is cancelled. */
        close: () => Promise<void>
        /**
         * Resolves with the next `length` bytes, fewer when the input ends before, none once it
         * ended. The bytes are a view that is only valid until the next read: copy them to keep
         * them.
         */
        read: (length: number) => Promise<Uint8Array>
    }
}

export const BinaryStream = {
    reader,
    writer,
}
