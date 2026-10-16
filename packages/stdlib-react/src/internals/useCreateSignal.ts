import { Signal } from "@monstermann/stdlib"
import { useState } from "react"

export function useCreateSignal<T>(value: T): Signal<T> {
    return useState(() => Signal(value))[0]
}
