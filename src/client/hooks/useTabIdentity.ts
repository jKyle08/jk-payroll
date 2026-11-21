// ==============================================================================
// JK-PAYROLL: USE-TAB-IDENTITY HOOK
// Returns the stable, isolated tab identifier for the current browser tab.
// File: src/client/hooks/useTabIdentity.ts
// ==============================================================================

import { useState, useEffect } from 'react';
import { getTabId } from '../core/persistence/TabIdentity.js';

export function useTabIdentity(): string {
  const [tabId, setTabId] = useState<string>(() => getTabId());

  useEffect(() => {
    setTabId(getTabId());
  }, []);

  return tabId;
}

export default useTabIdentity;
