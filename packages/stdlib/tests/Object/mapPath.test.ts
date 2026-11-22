import { describe, expect, it } from "bun:test"
import { mapPath } from "../../src/Object/mapPath"

interface State {
    tracks: { title: string }[]
    user: {
        name: string
        settings: { fontSize: number, theme: "dark" | "light" }
        team?: { name: string }
    }
}

const state: State = {
    tracks: [{ title: "a" }],
    user: { name: "Ada", settings: { fontSize: 14, theme: "light" } },
}

describe("Object.mapPath", () => {
    it("should map into copies of every level on the way", () => {
        const result = mapPath(state, "user.settings.fontSize", (size) => size + 1)
        expect(result).toEqual({ ...state, user: { ...state.user, settings: { fontSize: 15, theme: "light" } } })
        expect(result.tracks).toBe(state.tracks)
        expect(state.user.settings.fontSize).toBe(14)
    })

    it("should return the same object when nothing changed", () => {
        expect(mapPath(state, "user.settings.theme", (theme) => theme)).toBe(state)
        expect(mapPath(state, "user", (user) => user)).toBe(state)
    })

    it("should map a path of one key, and a whole object", () => {
        expect(mapPath(state, "tracks", (tracks) => [...tracks, { title: "b" }]).tracks).toEqual([{ title: "a" }, { title: "b" }])
        expect(mapPath(state, "user.settings", (settings) => ({ ...settings, theme: "dark" as const })).user.settings).toEqual({ fontSize: 14, theme: "dark" })
    })

    it("should check the path and what map returns", () => {
        // @ts-expect-error not a key
        mapPath(state, "user.nope", (x) => x)
        // @ts-expect-error not a value of that key
        mapPath(state, "user.settings.theme", () => "blue")
        const withTeam = { ...state, user: { ...state.user, team: { name: "Core" } } }
        // @ts-expect-error the team may be missing, and could not be made up
        mapPath(withTeam as State, "user.team.name", (name) => name)
    })
})
