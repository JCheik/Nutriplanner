'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

/**
 * Umbrella guard for every /admin/* route. Redirects non-admins away and shows
 * a loader while permissions are being verified, so no admin sub-page renders
 * for a non-admin. This is a UX/defense-in-depth layer — the real enforcement
 * lives in Firestore rules and the verifyAdmin() checks in the server actions.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, loading, router]);

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  return <>{children}</>;
}
