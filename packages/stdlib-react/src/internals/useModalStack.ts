import type { Modal } from "../Modals"
import { Modals } from "../Modals"
import { useSignalEffect } from "../useSignalEffect"

/**
 * Keeps a modal on the stack while the modal is open and rendered. The modal leaves the stack when
 * the modal closes, the floating element unmounts, or the component unmounts.
 */
export function useModalStack(modal: Modal): void {
    useSignalEffect(() => {
        if (!modal.$open() || !modal.$floating()) return
        Modals.open(modal)
        return () => Modals.close(modal)
    })
}
