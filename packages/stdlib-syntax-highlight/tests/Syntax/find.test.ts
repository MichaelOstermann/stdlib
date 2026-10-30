import { describe, expect, it } from "bun:test"
import { find } from "../../src/Syntax/find"

describe("find", () => {
    it("finds a language by name or extension, ignoring case", () => {
        expect(find("ts")?.title).toBe("TypeScript")
        expect(find("typescript")?.title).toBe("TypeScript")
        expect(find("TypeScript")?.title).toBe("TypeScript")
        expect(find(" tsx ")?.title).toBe("TSX")
        expect(find("C#")?.title).toBe("C#")
    })

    it("falls back to the closest language", () => {
        expect(find("javascrip")?.title).toBe("JavaScript")
        expect(find("pyth")?.title).toBe("Python")
        expect(find("golang")?.title).toBe("Go")
        expect(find("pytohn")).toBeUndefined()
    })

    it("finds languages the list used to get wrong", () => {
        expect(find("objc")?.title).toBe("Objective-C")
        expect(find("mm")?.title).toBe("Objective-C++")
        expect(find("vlang")?.title).toBe("V")
        expect(find("carbon")?.title).toBe("Carbon")
        expect(find("r")?.title).toBe("R")
        expect(find("console")?.title).toBe("Shell Session")
    })

    it("finds the language of common code fences", () => {
        const fences = {
            "apache": "ApacheConf",
            "asm": "Assembly",
            "astro": "Astro",
            "bash": "Shell",
            "bat": "Batchfile",
            "c": "C",
            "c#": "C#",
            "c++": "C++",
            "cc": "C++",
            "cjs": "JavaScript",
            "clj": "Clojure",
            "clojure": "Clojure",
            "cmake": "CMake",
            "cmd": "Batchfile",
            "conf": "INI",
            "console": "Shell Session",
            "cpp": "C++",
            "cs": "C#",
            "csharp": "C#",
            "css": "CSS",
            "csv": "CSV",
            "cts": "TypeScript",
            "d": "D",
            "dart": "Dart",
            "diff": "Diff",
            "docker": "Dockerfile",
            "dockerfile": "Dockerfile",
            "elixir": "Elixir",
            "elm": "Elm",
            "erl": "Erlang",
            "ex": "Elixir",
            "exs": "Elixir",
            "fish": "Fish",
            "fs": "F#",
            "fsharp": "F#",
            "gitignore": "Ignore List",
            "go": "Go",
            "golang": "Go",
            "gql": "GraphQL",
            "gradle": "Gradle",
            "graphql": "GraphQL",
            "groovy": "Groovy",
            "h": "C",
            "haskell": "Haskell",
            "hcl": "Terraform",
            "hpp": "C++",
            "hs": "Haskell",
            "htm": "HTML",
            "html": "HTML",
            "http": "HTTP",
            "ini": "INI",
            "java": "Java",
            "javascript": "JavaScript",
            "jl": "Julia",
            "js": "JavaScript",
            "json": "JSON",
            "json5": "JSON5",
            "jsonc": "JSONC",
            "jsx": "JavaScript",
            "julia": "Julia",
            "kotlin": "Kotlin",
            "kt": "Kotlin",
            "latex": "TeX",
            "less": "Less",
            "lisp": "Common Lisp",
            "lua": "Lua",
            "m": "MATLAB",
            "make": "Makefile",
            "makefile": "Makefile",
            "markdown": "Markdown",
            "matlab": "MATLAB",
            "md": "Markdown",
            "mdx": "MDX",
            "mjs": "JavaScript",
            "ml": "OCaml",
            "mm": "Objective-C++",
            "mts": "TypeScript",
            "nginx": "NGINX",
            "nim": "Nim",
            "nix": "Nix",
            "objc": "Objective-C",
            "ocaml": "OCaml",
            "patch": "Diff",
            "perl": "Perl",
            "php": "PHP",
            "pl": "Perl",
            "powershell": "PowerShell",
            "proto": "Protobuf",
            "ps1": "PowerShell",
            "pwsh": "PowerShell",
            "py": "Python",
            "python": "Python",
            "python3": "Python",
            "r": "R",
            "rb": "Ruby",
            "regex": "RegEx",
            "rs": "Rust",
            "ruby": "Ruby",
            "rust": "Rust",
            "sass": "Sass",
            "scala": "Scala",
            "scheme": "Scheme",
            "scss": "SCSS",
            "sh": "Shell",
            "shell": "Shell",
            "sol": "Solidity",
            "sql": "SQL",
            "svelte": "Svelte",
            "swift": "Swift",
            "terraform": "Terraform",
            "tex": "TeX",
            "tf": "Terraform",
            "toml": "TOML",
            "ts": "TypeScript",
            "tsx": "TSX",
            "typescript": "TypeScript",
            "v": "V",
            "vim": "Vim script",
            "vue": "Vue",
            "wasm": "WebAssembly",
            "wat": "WebAssembly",
            "xml": "XML",
            "yaml": "YAML",
            "yml": "YAML",
            "zig": "Zig",
            "zsh": "Shell",
        }
        expect(Object.fromEntries(Object.keys(fences).map((fence) => [fence, find(fence)?.title]))).toEqual(fences)
    })

    it("gives nothing for words that name no language", () => {
        expect(find("text")).toBeUndefined()
        expect(find("txt")).toBeUndefined()
        expect(find("plaintext")).toBeUndefined()
        expect(find("log")).toBeUndefined()
        expect(find("")).toBeUndefined()
    })
})
