import {
  BarChart3,
  Bot,
  BrainCircuit,
  Database,
  FlaskConical,
  Home,
  KeyRound,
  MessageSquare,
  Settings,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useSessionStore } from '../../store/sessionStore';

const workspaceItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/upload', label: 'Upload Dataset', icon: UploadCloud },
  { to: '/train', label: 'Train Model', icon: BrainCircuit },
  { to: '/explain', label: 'Explain', icon: BarChart3 },
  { to: '/experiments', label: 'Experiments', icon: FlaskConical },
];

function NavItem({ to, label, icon: Icon }: (typeof workspaceItems)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors',
          isActive
            ? 'border-accent bg-sidebar-hover text-white'
            : 'border-transparent text-slate-400 hover:bg-sidebar-hover hover:text-white',
        ].join(' ')
      }
    >
      <Icon size={20} strokeWidth={1.5} />
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const activeExperimentId = useSessionStore((state) => state.activeExperimentId);
  const activeExperiment = useSessionStore((state) =>
    state.experiments.find((experiment) => experiment.id === activeExperimentId),
  );

  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-white">
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-accent">
          <Sparkles size={19} strokeWidth={1.5} />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wide">AstraML</div>
          <div className="text-xs text-slate-500">Data Science Copilot</div>
        </div>
      </div>

      <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        <div className="px-5 pb-2">Workspace</div>
        <nav className="space-y-1">
          {workspaceItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
      </div>

      <div className="mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        <div className="px-5 pb-2">Session</div>
        <NavItem to="/chat" label="Chat with Astra" icon={MessageSquare} />
        <div className="mx-4 mt-3 rounded border border-sidebar-border bg-[#141419] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            <Database size={15} strokeWidth={1.5} />
            Current Experiment
          </div>
          <div className="truncate text-sm font-medium text-slate-200">
            {activeExperiment?.name ?? 'No active experiment'}
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-sidebar-border py-3">
        <button className="flex w-full items-center gap-3 px-5 py-2 text-sm text-slate-400 hover:bg-sidebar-hover hover:text-white">
          <Settings size={20} strokeWidth={1.5} />
          Settings
        </button>
        <button className="flex w-full items-center gap-3 px-5 py-2 text-sm text-slate-400 hover:bg-sidebar-hover hover:text-white">
          <KeyRound size={20} strokeWidth={1.5} />
          API Keys
        </button>
        <div className="mx-5 mt-3 flex items-center gap-2 rounded border border-sidebar-border px-3 py-2 text-xs text-slate-500">
          <Bot size={15} strokeWidth={1.5} />
          Astra waits for approval
        </div>
      </div>
    </aside>
  );
}
