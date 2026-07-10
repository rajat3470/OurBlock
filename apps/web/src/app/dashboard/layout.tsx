'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Societies', href: '/dashboard/societies', icon: '🏘️' },
  { name: 'Businesses', href: '/dashboard/businesses', icon: '🏪' },
  { name: 'Users', href: '/dashboard/users', icon: '👥' },
  { name: 'Orders', href: '/dashboard/orders', icon: '📦' },
  { name: 'Banners', href: '/dashboard/banners', icon: '🖼️' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/login');
      } else {
        setUserEmail(user.email || '');
        setAuthChecked(true);
      }
    });
    return unsubscribe;
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const initials = userEmail ? userEmail[0].toUpperCase() : 'A';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">O</span>
              </div>
              <span className="font-bold text-gray-900 text-base">mohallaMitr</span>
              <span className="ml-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                Super Admin
              </span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <span className="hidden sm:block text-sm text-gray-700 max-w-[140px] truncate">{userEmail}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <p className="px-4 py-2 text-xs text-gray-400 truncate border-b border-gray-100">{userEmail}</p>
                  <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    ⚙️ Settings
                  </Link>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    🚪 Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden border-t border-gray-100 flex overflow-x-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link key={item.name} href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition ${
                  isActive ? 'text-indigo-600 border-t-2 border-indigo-600' : 'text-gray-500 border-t-2 border-transparent'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Click-outside to close menu */}
      {menuOpen && <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />}

      {/* Page content */}
      <main className="flex-1">{children}</main>

      <footer className="py-3 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
        mohallaMitr Super Admin · Production API Connected
      </footer>
    </div>
  );
}


