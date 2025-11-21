'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PageHeader } from '@/components/layout/page-header';

const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    // Simple check, can be improved
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};


export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();

  useEffect(() => {
    // If user is on desktop and lands on a mobile page, redirect them away
    if (!isMobileDevice()) {
      router.replace('/');
    }
  }, [router]);
  
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader />
      <main className="flex-1 pb-20">{children}</main>
      <MobileNav />
    </div>
  )
}

    