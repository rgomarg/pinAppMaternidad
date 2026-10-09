import { Outlet } from 'react-router-dom';
import BottomNavBar from './BottomNavBar';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen pb-20 max-w-md mx-auto relative bg-nanny-bg border-x border-nanny-border shadow-xl">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNavBar />
    </div>
  );
}
