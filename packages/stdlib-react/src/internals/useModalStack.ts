import type { Modal } from "../Modals"
import { Modals } from "../Modals"
import { useSignalEffect } from "../useSignalEffect"

/**
 * On the stack while open and rendered. The cleanup takes the modal off when it closes, when the
 * floating element unmounts, or when the component unmounts.
 */
export function useModalStack(modal: Modal): void {
    useSignalEffect(() => {
        if (!modal.$open() || !modal.$floating()) return
        Modals.open(modal)
        return () => Modals.close(modal)
    })
}
