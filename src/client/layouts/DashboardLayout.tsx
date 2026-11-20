// ==============================================================================
// JK-PAYROLL: DASHBOARD SHELL LAYOUT
// File: src/client/layouts/DashboardLayout.tsx
// ==============================================================================

import React from 'react';
import { AppLayout, AppLayoutProps } from './AppLayout.js';

export type DashboardLayoutProps = AppLayoutProps;

export const DashboardLayout: React.FC<DashboardLayoutProps> = (props) => {
  return <AppLayout {...props} />;
};

export { AppLayout };
export default DashboardLayout;
