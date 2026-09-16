'use client';

import React from 'react';
import AuthGuard from '@/components/auth-guard';
import { AppShell } from '@/components/app-shell';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['driver', 'admin']}>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
