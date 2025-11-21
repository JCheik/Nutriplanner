import { MobileNav } from '@/components/layout/mobile-nav';
import { PageHeader } from '@/components/layout/page-header';

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader />
      <main className="flex-1 pb-20">{children}</main>
      <MobileNav />
    </div>
  )
}
