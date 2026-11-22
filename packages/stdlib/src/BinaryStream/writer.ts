const CHUNK_SIZE = 64 * 1024

/**
 * `BinaryStream.writer(chunks)`
 *
 * Creates a `ReadableStream` of `chunks`, joined into chunks of 64 KiB: many small ones are slow to
 * send. `chunks` is iterated as the stream is read, so the one who reads decides how fast it flows.
 * Chunks are copied, they can be reused once the next one is asked for.
 *
 * ```ts
 * async function* frames() {
 *     for (const message of messages) yield encode(message);
 * }
 *
 * new Response(BinaryStream.writer(frames()));
 * await Bun.write(path, new Response(BinaryStream.writer(frames())));
 * ```
 */
export function writer(chunks: AsyncIterable<Uint8Array> | Iterable<Uint8Array>): ReadableStream<Uint8Array> {
    const iterator = Symbol.asyncIterator in chunks ? chunks[Symbol.asyncIterator]() : chunks[Symbol.iterator]()
    let batch = new Uint8Array(CHUNK_SIZE)
    let filled = 0

    return new ReadableStream({
        async cancel(reason) {
            await iterator.return?.(reason)
        },
        async pull(controller) {
            while (true) {
                const result = await iterator.next()

                if (result.done) {
                    if (filled > 0) controller.enqueue(batch.subarray(0, filled))
                    controller.close()
                    return
                }

                const bytes = result.value

                if (filled + bytes.length <= batch.length) {
                    batch.set(bytes, filled)
                    filled += bytes.length
                    continue
                }

                const full = batch.subarray(0, filled)
                batch = new Uint8Array(Math.max(CHUNK_SIZE, bytes.length))
                batch.set(bytes, 0)
                filled = bytes.length

                if (full.length === 0) continue
                controller.enqueue(full)
                return
            }
        },
    })
}
