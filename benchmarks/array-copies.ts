import { bench } from "./bench"

// Copying an array with slice() and with a spread.

const ten = Array.from({ length: 10 }, (_, i) => i)
const thousand = Array.from({ length: 1000 }, (_, i) => i)

bench("10 items, slice", ten, (items) => items.slice())
bench("10 items, spread", ten, (items) => [...items])
bench("1000 items, slice", thousand, (items) => items.slice())
bench("1000 items, spread", thousand, (items) => [...items])
