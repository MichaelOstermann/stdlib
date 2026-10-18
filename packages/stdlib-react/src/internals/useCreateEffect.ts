import { Effect } from "@monstermann/stdlib"
import { useEffect } from "react"

export function useCreateEffect(callback: () => (() => void) | void): void {
    useEffect(() => Effect(callback), [callback])
}
