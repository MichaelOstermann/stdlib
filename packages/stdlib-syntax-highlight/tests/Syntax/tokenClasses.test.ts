import { readFileSync } from "node:fs"
import { describe, expect, it } from "bun:test"
import { tokenClasses } from "../../src/Syntax/internals/tokenClasses"

describe("tokenClasses", () => {
    it("are the classes of the tokenizer, in its order", () => {
        const rust = readFileSync(new URL("../../../../crates/stdlib-syntax-highlight/src/theme.rs", import.meta.url), "utf8")
        const list = rust.slice(rust.indexOf("pub const CLASSES"), rust.indexOf("];", rust.indexOf("pub const CLASSES")))
        expect([...list.matchAll(/^\s+"([a-z]+)",$/gm)].map((match) => match[1])).toEqual([...tokenClasses])
    })
})
