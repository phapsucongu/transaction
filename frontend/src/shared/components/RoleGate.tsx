'use client';

import { Alert } from '@mui/material';
import { useAuthUser } from '@/features/auth/auth.hooks';
import type { UserRole } from '@/features/auth/auth.types';

interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ allowedRoles, children, fallback }: RoleGateProps) {
  const user = useAuthUser();

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback ?? <Alert severity="warning">You do not have permission for this action.</Alert>;
  }

  return <>{children}</>;
}

