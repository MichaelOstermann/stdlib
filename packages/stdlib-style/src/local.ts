import { noMixedOperators } from "./rules/noMixedOperators.js"

// The rules of our own that Oxlint loads as a JS plugin.
export default {
    meta: {
        name: "stdlib-style",
    },
    rules: {
        "no-mixed-operators": noMixedOperators,
    },
}
