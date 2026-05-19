import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Trophy, User, ShoppingBag, LogOut, Coffee, BarChart, MessageCircle, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export default function AppLayout() {
  const logout = useAuthStore(state => state.logout);

  const navItems = [
    { path: '/app/lobbies', icon: Home, label: 'Lobiler' },
    { path: '/app/analytics', icon: BarChart, label: 'İstatistik' },
    { path: '/app/leaderboard', icon: Trophy, label: 'Sıralama' },
    { path: '/app/dm', icon: MessageCircle, label: 'Mesajlar' },
    { path: '/app/shop', icon: ShoppingBag, label: 'Market' },
    { path: '/app/premium', icon: Crown, label: 'Premium' },
    { path: '/app/profile', icon: User, label: 'Profil' },
  ];

  return (
    <div className="flex h-screen bg-background text-textDark font-montserrat overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-border flex flex-col justify-between hidden md:flex z-20 shadow-soft">
        <div>
          <div className="h-20 flex items-center px-8 border-b border-border">
            <h1 className="text-xl font-black text-primary flex items-center gap-2">
              <Coffee className="w-6 h-6 text-accent" />
              StudyLounge
            </h1>
          </div>
          <nav className="p-4 flex flex-col gap-2 mt-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                    isActive
                      ? 'bg-softIndigo text-primary shadow-sm'
                      : 'text-textMuted hover:bg-gray-50 hover:text-textDark'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-border">
          <button className="flex items-center gap-4 px-4 py-3 rounded-xl w-full text-danger hover:bg-softDanger font-bold text-sm transition-colors">
            <LogOut className="w-5 h-5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col bg-background h-screen overflow-y-auto">
        {/* Mobile Header (Hidden on MD+) */}
        <div className="md:hidden h-16 bg-white border-b border-border flex items-center justify-between px-4 sticky top-0 z-20">
            <h1 className="text-lg font-black text-primary">StudyLounge</h1>
            <Coffee className="w-5 h-5 text-accent" />
        </div>

        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 w-full">
          <Outlet />
        </div>

        {/* Mobile Bottom Tab (Hidden on MD+) */}
        <nav className="md:hidden bg-white border-t border-border h-16 flex justify-around items-center sticky bottom-0 z-20 pb-safe">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                    isActive ? 'text-primary' : 'text-textMuted'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-bold">{item.label}</span>
              </NavLink>
            ))}
        </nav>
      </main>
    </div>
  );
}
