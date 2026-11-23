// ==============================================================================
// PAYPULSE: ACCESSIBLE MODAL INERT STACK & BACKGROUND ISOLATION
// Ensures background elements cannot receive focus, pointer, or AT interaction
// Supports safe nested modal stacks with automatic restoration
// File: src/client/components/ui/modal-inert.ts
// ==============================================================================

interface ActiveModal {
  id: string;
  dialogElement: HTMLElement | null;
  triggerElement: HTMLElement | null;
}

const activeModalStack: ActiveModal[] = [];
let isolatedBackgroundElements: HTMLElement[] = [];

/**
 * Isolates background application content when the first modal opens.
 * When nested modals open, inerts the parent modal until the child closes.
 */
export function registerModal(
  id: string,
  dialogElement: HTMLElement | null,
  triggerElement: HTMLElement | null
): () => void {
  if (typeof document === 'undefined') return () => {};

  // If this is the root modal, isolate all main page content
  if (activeModalStack.length === 0) {
    const root = document.getElementById('root') || document.body;
    // Find all top-level elements that are not modals or portals
    const candidates = Array.from(root.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        !el.hasAttribute('data-modal-container') &&
        el.getAttribute('role') !== 'dialog'
    );

    isolatedBackgroundElements = candidates;
    isolatedBackgroundElements.forEach((el) => {
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
    });
  } else {
    // Nested modal: inert the previous modal on the stack
    const parentModal = activeModalStack[activeModalStack.length - 1];
    if (parentModal?.dialogElement) {
      parentModal.dialogElement.setAttribute('inert', '');
      parentModal.dialogElement.setAttribute('aria-hidden', 'true');
    }
  }

  activeModalStack.push({ id, dialogElement, triggerElement });

  // Return unregister cleanup function
  return () => {
    unregisterModal(id);
  };
}

/**
 * Unregisters a modal and restores background/parent interactivity.
 */
export function unregisterModal(id: string): void {
  if (typeof document === 'undefined') return;

  const index = activeModalStack.findIndex((m) => m.id === id);
  if (index === -1) return;

  const [removed] = activeModalStack.splice(index, 1);

  if (activeModalStack.length > 0) {
    // Restore the current top modal on the stack
    const topModal = activeModalStack[activeModalStack.length - 1];
    if (topModal?.dialogElement) {
      topModal.dialogElement.removeAttribute('inert');
      topModal.dialogElement.removeAttribute('aria-hidden');
    }
    // Return focus to trigger in parent modal
    if (removed.triggerElement && typeof removed.triggerElement.focus === 'function') {
      removed.triggerElement.focus();
    }
  } else {
    // Stack is empty: release all background application elements
    isolatedBackgroundElements.forEach((el) => {
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
    });
    isolatedBackgroundElements = [];

    // Return focus to page trigger
    if (removed.triggerElement && typeof removed.triggerElement.focus === 'function') {
      removed.triggerElement.focus();
    }
  }
}
