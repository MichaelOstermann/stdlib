import { String } from "@monstermann/stdlib"

export function suggest(input: string, names: string[]): string[] {
    const typos = Math.max(1, Math.floor(input.length / 3))
    return names
        .map((name) => ({ distance: String.distance(input, name), name, score: String.score(name, input) }))
        .filter(({ distance, score }) => distance <= typos || score > 0)
        .sort((a, b) => a.distance - b.distance)
        .map(({ name }) => name)
}
