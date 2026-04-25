import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <TopBar />
      <main className="ml-60 pt-12">
        <div className="mx-auto max-w-6xl p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
