import type { MaybeDisposerValue } from "@monstermann/stdlib"
import { Effect } from "@monstermann/stdlib"
import { useEffect } from "react"

export function useCreateEffect(callback: () => MaybeDisposerValue): void {
    useEffect(() => Effect(callback).dispose, [callback])
}
