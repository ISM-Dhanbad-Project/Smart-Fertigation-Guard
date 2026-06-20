"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, BrainCircuit, Sliders } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { translations } from '@/services/translations';

export default function Navigation() {
  const pathname = usePathname();
  const { state } = useAppContext();
  const t = translations[state.language || 'EN'];

  const navItems = [
    { href: '/', label: t.dashboard, icon: Home },
    { href: '/control', label: t.control, icon: Sliders },
    { href: '/history', label: t.logs, icon: History },
    { href: '/insights', label: t.insights, icon: BrainCircuit },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 pb-safe z-50">
      <nav className="flex justify-around items-center max-w-md mx-auto p-3">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${isActive ? 'text-emerald-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
