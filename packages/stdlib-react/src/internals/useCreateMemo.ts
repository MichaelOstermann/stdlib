import { Memo } from "@monstermann/stdlib"
import { useMemo } from "react"

export function useCreateMemo<T>(compute: () => T): Memo<T> {
    return useMemo(() => Memo(compute), [compute])
}
