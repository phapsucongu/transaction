/**
 * Protected layout - Server Component that renders Client Component
 */

import { ReactNode } from 'react';
import ProtectedLayoutContent from './layout-content';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export const dynamic = 'force-dynamic';

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return <ProtectedLayoutContent>{children}</ProtectedLayoutContent>;
}
