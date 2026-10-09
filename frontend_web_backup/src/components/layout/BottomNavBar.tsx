import { NavLink } from 'react-router-dom';
import { Activity, Calendar, Users, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

export default function BottomNavBar() {
  const tabs = [
    { name: 'Datos', path: '/', icon: Activity },
    { name: 'Calendario', path: '/calendario', icon: Calendar },
    { name: 'Familia', path: '/familia', icon: Users },
    { name: 'Foro', path: '/foro', icon: MessageSquare },
  ];

  return (
    <nav className="fixed bottom-0 w-full max-w-md mx-auto bg-white border-t border-nanny-border py-2 px-6 flex justify-between items-center rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.name}
            to={tab.path}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center gap-1 min-w-[64px]',
                isActive ? 'text-nanny-blue' : 'text-nanny-muted'
              )
            }
          >
            <Icon size={24} strokeWidth={2} />
            <span className="text-xs font-medium">{tab.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
