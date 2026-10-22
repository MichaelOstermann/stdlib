import { describe, expect, it } from "bun:test"
import { setPath } from "../../src/Object/setPath"

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

describe("Object.setPath", () => {
    it("should set into copies of every level on the way", () => {
        const result = setPath(state, "user.settings.theme", "dark")
        expect(result).toEqual({ ...state, user: { ...state.user, settings: { fontSize: 14, theme: "dark" } } })
        expect(result.tracks).toBe(state.tracks)
        expect(state.user.settings.theme).toBe("light")
    })

    it("should return the same object when nothing changed", () => {
        expect(setPath(state, "user.settings.theme", "light")).toBe(state)
        expect(setPath(state, "user.name", "Ada")).toBe(state)
    })

    it("should set a path of one key, and a whole object", () => {
        const tracks = [{ title: "b" }]
        expect(setPath(state, "tracks", tracks).tracks).toBe(tracks)
        expect(setPath(state, "user.settings", { fontSize: 16, theme: "dark" }).user.settings).toEqual({ fontSize: 16, theme: "dark" })
    })

    it("should set an optional object, but not go through it", () => {
        const withTeam = setPath(state, "user.team", { name: "Core" })
        expect(withTeam.user.team).toEqual({ name: "Core" })
        expect(setPath(withTeam, "user.team", undefined).user.team).toBeUndefined()
        // @ts-expect-error the team may be missing, and could not be made up
        setPath(withTeam, "user.team.name", "Ops")
    })

    it("should check the path and the value", () => {
        // @ts-expect-error not a key
        setPath(state, "user.nope", 1)
        // @ts-expect-error not a value of that key
        setPath(state, "user.settings.theme", "blue")
        // @ts-expect-error no paths through arrays
        setPath(state, "tracks.0.title", "x")
    })
})
