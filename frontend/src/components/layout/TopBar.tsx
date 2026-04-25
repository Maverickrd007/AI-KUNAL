import { Plus, UserCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function TopBar() {
  const location = useLocation();
  const page = location.pathname.split('/').filter(Boolean).join(' / ') || 'dashboard';

  return (
    <header className="fixed left-60 right-0 top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-canvas px-6">
      <div className="text-sm text-text-secondary">
        <span className="text-text-muted">AstraML</span>
        <span className="px-2 text-text-muted">/</span>
        <span className="capitalize text-text-primary">{page}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
        >
          <Plus size={16} strokeWidth={1.5} />
          New Experiment
        </Link>
        <button className="rounded p-1 text-text-secondary hover:bg-canvas-secondary" aria-label="Profile">
          <UserCircle size={24} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
