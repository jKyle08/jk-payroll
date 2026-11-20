// ==============================================================================
// JK-PAYROLL: CENTRALIZED SIDEBAR STATE & CONTEXT
// File: src/client/components/layout/SidebarContext.tsx
// ==============================================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

export interface SidebarContextValue {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleMobile: () => void;
  openMobile: () => void;
  closeMobile: () => void;
  width: number;
}

export interface SidebarProviderProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

const STORAGE_KEY = 'paypulse_sidebar_collapsed';
const SIDEBAR_WIDTH = 260;

const defaultContextValue: SidebarContextValue = {
  isCollapsed: false,
  isMobileOpen: false,
  toggleSidebar: () => {},
  setCollapsed: () => {},
  toggleMobile: () => {},
  openMobile: () => {},
  closeMobile: () => {},
  width: SIDEBAR_WIDTH,
};

export const SidebarContext = createContext<SidebarContextValue>(defaultContextValue);

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultCollapsed;
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync isCollapsed to localStorage
  const setCollapsed = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setIsCollapsed((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEY, String(next));
          } catch {
            // ignore storage errors
          }
        }
        return next;
      });
    },
    []
  );

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  const toggleMobile = useCallback(() => setIsMobileOpen((prev) => !prev), []);

  const toggleSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  }, [setCollapsed]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  // Close mobile drawer when resizing up to desktop
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileOpen]);

  // Keyboard shortcut: Cmd+B / Ctrl+B to toggle, Escape to close mobile drawer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, isMobileOpen]);

  const value = useMemo<SidebarContextValue>(
    () => ({
      isCollapsed,
      isMobileOpen,
      toggleSidebar,
      setCollapsed,
      toggleMobile,
      openMobile,
      closeMobile,
      width: SIDEBAR_WIDTH,
    }),
    [
      isCollapsed,
      isMobileOpen,
      toggleSidebar,
      setCollapsed,
      toggleMobile,
      openMobile,
      closeMobile,
    ]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextValue => {
  return useContext(SidebarContext);
};

export default SidebarProvider;
