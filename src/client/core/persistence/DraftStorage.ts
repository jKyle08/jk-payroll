// ==============================================================================
// JK-PAYROLL: BROWSER DRAFT STORAGE ADAPTER
// Robust sessionStorage wrapper with in-memory fallback & quota protection.
// File: src/client/core/persistence/DraftStorage.ts
// ==============================================================================

export interface IDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): boolean;
  removeItem(key: string): void;
  getAllKeys(): string[];
  clear(): void;
}

class InMemoryStorage implements IDraftStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): boolean {
    this.store.set(key, value);
    return true;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  clear(): void {
    this.store.clear();
  }
}

class BrowserSessionDraftStorage implements IDraftStorage {
  private memoryFallback: InMemoryStorage = new InMemoryStorage();

  private isAvailable(): boolean {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return false;
    }
    try {
      const probe = '__paypulse_probe__';
      window.sessionStorage.setItem(probe, '1');
      window.sessionStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.isAvailable()) {
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        return this.memoryFallback.getItem(key);
      }
    }
    return this.memoryFallback.getItem(key);
  }

  setItem(key: string, value: string): boolean {
    if (this.isAvailable()) {
      try {
        window.sessionStorage.setItem(key, value);
        return true;
      } catch {
        // QuotaExceededError or security block: use in-memory fallback
        return this.memoryFallback.setItem(key, value);
      }
    }
    return this.memoryFallback.setItem(key, value);
  }

  removeItem(key: string): void {
    if (this.isAvailable()) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }
    this.memoryFallback.removeItem(key);
  }

  getAllKeys(): string[] {
    if (this.isAvailable()) {
      try {
        const keys: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) keys.push(key);
        }
        return keys;
      } catch {
        return this.memoryFallback.getAllKeys();
      }
    }
    return this.memoryFallback.getAllKeys();
  }

  clear(): void {
    if (this.isAvailable()) {
      try {
        window.sessionStorage.clear();
      } catch {
        // Ignore
      }
    }
    this.memoryFallback.clear();
  }
}

export const draftStorage: IDraftStorage = new BrowserSessionDraftStorage();
