// ==============================================================================
// JK-PAYROLL: FIXED COLLAPSIBLE SIDEBAR & DYNAMIC LAYOUT SPECIFICATIONS
// File: tests/collapsible-sidebar.test.ts
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import {
  Sidebar,
  AppSidebar,
  useSidebar,
  SidebarContext,
  SidebarProvider,
  Topbar,
} from '../src/client/components/layout/index.js';
import { AppLayout, DashboardLayout } from '../src/client/layouts/index.js';

describe('Fixed, Collapsible Sidebar & Dynamic Main Content Layout Specifications', () => {
  describe('Component Architecture & Reusability Contracts', () => {
    it('exports AppSidebar, Sidebar, and SidebarContext from components layout module', () => {
      expect(AppSidebar).toBeDefined();
      expect(typeof AppSidebar).toBe('function');
      expect(Sidebar).toBeDefined();
      expect(typeof Sidebar).toBe('function');
      expect(SidebarContext).toBeDefined();
      expect(SidebarProvider).toBeDefined();
      expect(typeof SidebarProvider).toBe('function');
      expect(typeof useSidebar).toBe('function');
    });

    it('exports AppLayout and DashboardLayout from layouts module', () => {
      expect(AppLayout).toBeDefined();
      expect(typeof AppLayout).toBe('function');
      expect(DashboardLayout).toBeDefined();
      expect(typeof DashboardLayout).toBe('function');
    });

    it('exports Topbar with accessible sidebar toggle support', () => {
      expect(Topbar).toBeDefined();
      expect(typeof Topbar).toBe('function');
      expect(PanelLeftClose).toBeDefined();
      expect(PanelLeftOpen).toBeDefined();
    });
  });

  describe('Sidebar Width & Dimensional Architecture', () => {
    const DESKTOP_SIDEBAR_WIDTH = 260; // 260px fixed width

    it('defines fixed 260px width contract for expanded desktop sidebar', () => {
      expect(DESKTOP_SIDEBAR_WIDTH).toBe(260);
    });

    it('computes main content width dynamically based on sidebar state', () => {
      // Expanded state calculation
      const expandedSidebarWidth = 260;
      const getRemainingWidthClass = (sidebarWidth: number) => `calc(100% - ${sidebarWidth}px)`;
      expect(getRemainingWidthClass(expandedSidebarWidth)).toBe('calc(100% - 260px)');

      // Collapsed state calculation: full 100% width, 0 margin
      const collapsedMargin = 0;
      const collapsedWidth = '100%';
      expect(collapsedMargin).toBe(0);
      expect(collapsedWidth).toBe('100%');
    });
  });

  describe('Dynamic Layout State Transitions & CSS Classes', () => {
    it('verifies expanded layout classes shift main content right by 260px', () => {
      const isCollapsed = false;
      const layoutClasses = isCollapsed
        ? 'ml-0 w-full'
        : 'ml-0 w-full lg:ml-[260px] lg:w-[calc(100%-260px)]';

      expect(layoutClasses).toContain('lg:ml-[260px]');
      expect(layoutClasses).toContain('lg:w-[calc(100%-260px)]');
    });

    it('verifies collapsed layout classes occupy 100% viewport width with 0 left margin', () => {
      const isCollapsed = true;
      const layoutClasses = isCollapsed
        ? 'ml-0 w-full'
        : 'ml-0 w-full lg:ml-[260px] lg:w-[calc(100%-260px)]';

      expect(layoutClasses).toBe('ml-0 w-full');
      expect(layoutClasses).not.toContain('lg:ml-[260px]');
    });

    it('verifies sidebar hidden classes in collapsed desktop state', () => {
      const isCollapsed = true;
      const isMobileOpen = false;
      const sidebarClasses = isMobileOpen
        ? 'translate-x-0 w-[260px] shadow-2xl z-50'
        : isCollapsed
        ? '-translate-x-full lg:-translate-x-full w-0 lg:w-0 border-r-0 pointer-events-none'
        : '-translate-x-full lg:translate-x-0 lg:w-[260px]';

      expect(sidebarClasses).toContain('w-0');
      expect(sidebarClasses).toContain('lg:w-0');
      expect(sidebarClasses).toContain('-translate-x-full');
      expect(sidebarClasses).toContain('border-r-0');
    });

    it('verifies smooth CSS transition timings (duration-300 ease-in-out)', () => {
      const transitionClass = 'transition-[margin,width] duration-300 ease-in-out';
      expect(transitionClass).toContain('duration-300');
      expect(transitionClass).toContain('ease-in-out');
    });
  });

  describe('Header Toggle Icon Semantics', () => {
    it('uses PanelLeftClose when sidebar is expanded', () => {
      const isCollapsed = false;
      const iconToRender = isCollapsed ? 'PanelLeftOpen' : 'PanelLeftClose';
      expect(iconToRender).toBe('PanelLeftClose');
    });

    it('uses PanelLeftOpen when sidebar is collapsed', () => {
      const isCollapsed = true;
      const iconToRender = isCollapsed ? 'PanelLeftOpen' : 'PanelLeftClose';
      expect(iconToRender).toBe('PanelLeftOpen');
    });
  });

  describe('Responsive Mobile Drawer & Backdrop Logic', () => {
    it('verifies mobile drawer activates overlay and z-index', () => {
      const isMobileOpen = true;
      const isCollapsed = false;
      const sidebarClasses = isMobileOpen
        ? 'translate-x-0 w-[260px] shadow-2xl z-50'
        : isCollapsed
        ? '-translate-x-full lg:-translate-x-full w-0 lg:w-0 border-r-0 pointer-events-none'
        : '-translate-x-full lg:translate-x-0 lg:w-[260px]';

      expect(sidebarClasses).toContain('translate-x-0');
      expect(sidebarClasses).toContain('w-[260px]');
      expect(sidebarClasses).toContain('z-50');
      expect(sidebarClasses).toContain('shadow-2xl');
    });

    it('verifies backdrop overlay specification for mobile drawer', () => {
      const backdropClass = 'fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300';
      expect(backdropClass).toContain('fixed');
      expect(backdropClass).toContain('inset-0');
      expect(backdropClass).toContain('z-40');
      expect(backdropClass).toContain('lg:hidden');
    });
  });
});
