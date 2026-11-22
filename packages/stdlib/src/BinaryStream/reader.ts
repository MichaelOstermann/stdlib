import type { BinaryStream } from "."

const SPANNED_SIZE = 64 * 1024

/**
 * `BinaryStream.reader(source)`
 *
 * Creates a reader that reads from `source`. A stream is read from as the bytes are needed, so the
 * one who reads decides how fast it flows.
 *
 * ```ts
 * const reader = BinaryStream.reader(request.body);
 * // BinaryStream.reader(Bun.file(path).stream())
 * // BinaryStream.reader(bytes)
 *
 * const header = await reader.read(4);
 * if (header.length < 4) throw new Error("Truncated");
 * const length = new DataView(header.buffer, header.byteOffset).getUint32(0);
 * const payload = await reader.read(length);
 *
 * await reader.close();
 * ```
 */
export function reader(source: ReadableStream<Uint8Array> | Uint8Array): BinaryStream.Reader {
    const streamReader = source instanceof Uint8Array ? undefined : source.getReader()
    let chunk = source instanceof Uint8Array ? source : new Uint8Array(0)
    let offset = 0
    let spanned = new Uint8Array(SPANNED_SIZE)
    let position = 0

    async function read(length: number): Promise<Uint8Array> {
        if (chunk.length - offset >= length) {
            const bytes = chunk.subarray(offset, offset + length)
            offset += length
            position += length
            return bytes
        }

        if (spanned.length < length) {
            let capacity = spanned.length
            while (capacity < length) capacity *= 2
            spanned = new Uint8Array(capacity)
        }

        let filled = chunk.length - offset
        spanned.set(chunk.subarray(offset), 0)
        chunk = new Uint8Array(0)
        offset = 0

        while (filled < length) {
            const result = await streamReader?.read()
            if (!result || result.done) break
            chunk = result.value
            offset = Math.min(length - filled, chunk.length)
            spanned.set(chunk.subarray(0, offset), filled)
            filled += offset
        }

        position += filled
        return spanned.subarray(0, filled)
    }

    async function close(): Promise<void> {
        await streamReader?.cancel()
    }

    return {
        close,
        read,
        get position() {
            return position
        },
    }
}
