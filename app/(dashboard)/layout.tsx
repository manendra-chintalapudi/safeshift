'use client';

import { useEffect, useState } from 'react';
import BottomNav from '@/components/driver/BottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dark, setDark] = useState(false);

  // Read dark mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('safeshift-darkmode');
    if (saved === 'true') setDark(true);

    // Listen for changes from profile page
    function handleStorage(e: StorageEvent) {
      if (e.key === 'safeshift-darkmode') setDark(e.newValue === 'true');
    }
    // Also listen for custom event (same-tab)
    function handleCustom() {
      setDark(localStorage.getItem('safeshift-darkmode') === 'true');
    }
    window.addEventListener('storage', handleStorage);
    window.addEventListener('darkmode-toggle', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('darkmode-toggle', handleCustom);
    };
  }, []);

  return (
    <div className="min-h-screen" style={{
      position: 'relative',
      background: dark ? '#111111' : '#F6F7F9',
      color: dark ? '#E5E7EB' : '#1A1A1A',
      transition: 'background 0.3s ease, color 0.3s ease',
    }}>
      <main className="pb-20 max-w-lg mx-auto" style={{ position: 'relative' }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
