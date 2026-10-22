import { produce } from "immer"
import { create } from "mutative"
import { map } from "remeda"
import { bench } from "./bench"
import "@monstermann/stdlib/globals"

// Array.map against remeda map, and immer and mutative assigning each item.

const unchanged = (value: number): number => value
const changeLastOfTen = (value: number): number => value === 9 ? -1 : value
const changeLastOfThousand = (value: number): number => value === 999 ? -1 : value

const ten = Array.from({ length: 10 }, (_, i) => i)
const thousand = Array.from({ length: 1000 }, (_, i) => i)

bench("10 items, nothing changed, stdlib", ten, (items) => Array.map(items, unchanged))
bench("10 items, nothing changed, remeda", ten, (items) => map(items, unchanged))
bench("10 items, nothing changed, immer", ten, (items) => produce(items, (draft) => {
    for (let i = 0; i < draft.length; i++) draft[i] = unchanged(draft[i]!)
}))
bench("10 items, nothing changed, mutative", ten, (items) => create(items, (draft) => {
    for (let i = 0; i < draft.length; i++) draft[i] = unchanged(draft[i]!)
}))

bench("10 items, something changed, stdlib", ten, (items) => Array.map(items, changeLastOfTen))
bench("10 items, something changed, remeda", ten, (items) => map(items, changeLastOfTen))
bench("10 items, something changed, immer", ten, (items) => produce(items, (draft) => {
    for (let i = 0; i < draft.length; i++) draft[i] = changeLastOfTen(draft[i]!)
}))
bench("10 items, something changed, mutative", ten, (items) => create(items, (draft) => {
    for (let i = 0; i < draft.length; i++) draft[i] = changeLastOfTen(draft[i]!)
}))

bench("1000 items, nothing changed, stdlib", thousand, (items) => Array.map(items, unchanged))
bench("1000 items, nothing changed, remeda", thousand, (items) => map(items, unchanged))
bench("1000 items, nothing changed, immer", thousand, (items) => produce(items, (draft) => {
    for (let i = 0; i < draft.length; i++) draft[i] = unchanged(draft[i]!)
}))
bench("1000 items, nothing changed, mutative", thousand, (items) => create(items, (draft) => {
    for (let i = 0; i < draft.length; i++) draft[i] = unchanged(draft[i]!)
}))

bench("1000 items, something changed, stdlib", thousand, (items) => Array.map(items, changeLastOfThousand))
bench("1000 items, something changed, remeda", thousand, (items) => map(items, changeLastOfThousand))
bench("1000 items, something changed, immer", thousand, (items) => produce(items, (draft) => {
    for (let i = 0; i < draft.length; i++) draft[i] = changeLastOfThousand(draft[i]!)
}))
bench("1000 items, something changed, mutative", thousand, (items) => create(items, (draft) => {
    for (let i = 0; i < draft.length; i++) draft[i] = changeLastOfThousand(draft[i]!)
}))
