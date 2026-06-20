"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, BrainCircuit } from 'lucide-react';
import { cn } from '@/app/page'; // Need to refactor cn to a lib, but we can just use inline clsx

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/history', label: 'Logs', icon: History },
    { href: '/insights', label: 'AI Insights', icon: BrainCircuit },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 pb-safe">
      <nav className="flex justify-around items-center max-w-md mx-auto p-3">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${isActive ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
