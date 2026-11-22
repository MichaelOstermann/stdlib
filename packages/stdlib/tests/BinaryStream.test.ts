import { describe, expect, it } from "bun:test"
import { BinaryStream } from "../src/BinaryStream"

const bytes = Uint8Array.from({ length: 100 }, (_, index) => index)

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(controller) {
            for (const chunk of chunks) controller.enqueue(chunk)
            controller.close()
        },
    })
}

function chunked(size: number): ReadableStream<Uint8Array> {
    const chunks: Uint8Array[] = []
    for (let at = 0; at < bytes.length; at += size) chunks.push(bytes.slice(at, at + size))
    return streamOf(chunks)
}

async function readAll(stream: BinaryStream.Reader, lengths: number[]): Promise<number[][]> {
    const reads: number[][] = []
    for (const length of lengths) reads.push([...await stream.read(length)])
    return reads
}

const lengths = [5, 0, 30, 1, 64]
const expected = [
    [...bytes.subarray(0, 5)],
    [],
    [...bytes.subarray(5, 35)],
    [...bytes.subarray(35, 36)],
    [...bytes.subarray(36, 100)],
]

describe("BinaryStream.reader", () => {
    it("should read from bytes", async () => {
        expect(await readAll(BinaryStream.reader(bytes), lengths)).toEqual(expected)
    })

    for (const size of [1, 3, 7, 32, 100, 1000]) {
        it(`should read from a stream of ${size} byte chunks`, async () => {
            expect(await readAll(BinaryStream.reader(chunked(size)), lengths)).toEqual(expected)
        })
    }

    it("should skip empty chunks", async () => {
        const stream = BinaryStream.reader(streamOf([new Uint8Array(0), bytes.slice(0, 2), new Uint8Array(0), bytes.slice(2, 4)]))
        expect([...await stream.read(4)]).toEqual([0, 1, 2, 3])
    })

    it("should read fewer bytes when the input ends, then none", async () => {
        for (const stream of [BinaryStream.reader(bytes), BinaryStream.reader(chunked(7))]) {
            await stream.read(90)
            expect((await stream.read(20)).length).toBe(10)
            expect((await stream.read(20)).length).toBe(0)
        }
    })

    it("should read from an empty input", async () => {
        expect((await BinaryStream.reader(new Uint8Array(0)).read(5)).length).toBe(0)
        expect((await BinaryStream.reader(streamOf([])).read(5)).length).toBe(0)
    })

    it("should read more than it holds at first", async () => {
        const large = Uint8Array.from({ length: 200_000 }, (_, index) => index % 251)
        const stream = BinaryStream.reader(streamOf([large.slice(0, 1), large.slice(1)]))
        expect(await stream.read(200_000)).toEqual(large)
    })

    it("should count the bytes read", async () => {
        const stream = BinaryStream.reader(chunked(7))
        expect(stream.position).toBe(0)
        await stream.read(10)
        expect(stream.position).toBe(10)
        await stream.read(200)
        expect(stream.position).toBe(100)
    })

    it("should cancel the stream on close", async () => {
        let reason: unknown = "open"
        const source = new ReadableStream<Uint8Array>({
            cancel(cause) {
                reason = cause
            },
            pull(controller) {
                controller.enqueue(new Uint8Array(1))
            },
        })
        const stream = BinaryStream.reader(source)
        await stream.read(3)
        await stream.close()
        expect(reason).toBeUndefined()
    })

    it("should pull only what is read", async () => {
        let pulls = 0
        const source = new ReadableStream<Uint8Array>({
            pull(controller) {
                pulls++
                controller.enqueue(new Uint8Array(10))
            },
        }, { highWaterMark: 0 })
        const stream = BinaryStream.reader(source)
        await stream.read(25)
        expect(pulls).toBe(3)
    })
})

async function chunksOf(stream: ReadableStream<Uint8Array>): Promise<Uint8Array[]> {
    const chunks: Uint8Array[] = []
    for await (const chunk of stream) chunks.push(chunk)
    return chunks
}

function joined(chunks: Uint8Array[]): number[] {
    return chunks.flatMap((chunk) => [...chunk])
}

describe("BinaryStream.writer", () => {
    it("should join small chunks into chunks of 64 KiB", async () => {
        const small = Array.from({ length: 10_000 }, (_, index) => Uint8Array.of(index % 256, 1, 2, 3, 4, 5, 6, 7, 8, 9))
        const chunks = await chunksOf(BinaryStream.writer(small))
        expect(chunks.map((chunk) => chunk.length)).toEqual([65_530, 34_470])
        expect(joined(chunks)).toEqual(joined(small))
    })

    it("should pass chunks larger than 64 KiB on whole", async () => {
        const large = new Uint8Array(100_000).fill(7)
        const chunks = await chunksOf(BinaryStream.writer([Uint8Array.of(1), large, Uint8Array.of(2)]))
        expect(chunks.map((chunk) => chunk.length)).toEqual([1, 100_000, 1])
        expect(joined(chunks)).toEqual([1, ...large, 2])
    })

    it("should read from async iterables", async () => {
        async function* chunks(): AsyncIterable<Uint8Array> {
            yield Uint8Array.of(1)
            yield Uint8Array.of(2, 3)
        }
        expect(joined(await chunksOf(BinaryStream.writer(chunks())))).toEqual([1, 2, 3])
    })

    it("should write nothing for no chunks", async () => {
        expect(await chunksOf(BinaryStream.writer([]))).toEqual([])
    })

    it("should copy chunks, so they can be reused", async () => {
        const reused = new Uint8Array(1)
        function* chunks(): Iterable<Uint8Array> {
            for (let index = 0; index < 3; index++) {
                reused[0] = index
                yield reused
            }
        }
        expect(joined(await chunksOf(BinaryStream.writer(chunks())))).toEqual([0, 1, 2])
    })

    it("should iterate as the stream is read", async () => {
        let iterated = 0
        function* chunks(): Iterable<Uint8Array> {
            while (true) {
                iterated++
                yield new Uint8Array(40_000)
            }
        }
        const reader = BinaryStream.writer(chunks()).getReader()
        await reader.read()
        expect(iterated).toBeLessThan(10)
        await reader.cancel()
    })

    it("should stop the iterable when cancelled", async () => {
        let stopped = false
        function* chunks(): Iterable<Uint8Array> {
            try {
                while (true) yield new Uint8Array(40_000)
            }
            finally {
                stopped = true
            }
        }
        const reader = BinaryStream.writer(chunks()).getReader()
        await reader.read()
        await reader.cancel()
        expect(stopped).toBe(true)
    })

    it("should be read back by a reader", async () => {
        const frames = Array.from({ length: 1000 }, (_, index) => Uint8Array.from({ length: index % 300 }, () => index % 256))
        const reader = BinaryStream.reader(BinaryStream.writer(frames))
        for (const frame of frames) expect(await reader.read(frame.length)).toEqual(frame)
        expect((await reader.read(1)).length).toBe(0)
    })
})
