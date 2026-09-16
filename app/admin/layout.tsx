'use client';

import React from 'react';
import AuthGuard from '@/components/auth-guard';
import { AppShell } from '@/components/app-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
