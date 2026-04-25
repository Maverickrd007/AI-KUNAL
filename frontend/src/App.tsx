import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/layout/AppShell';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import Experiments from './pages/Experiments';
import Explain from './pages/Explain';
import Landing from './pages/Landing';
import Train from './pages/Train';
import Upload from './pages/Upload';

export default function App() {
  const hasUsedAstra = localStorage.getItem('astraml_used') === 'true';

  return (
    <Routes>
      <Route path="/" element={hasUsedAstra ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/train" element={<Train />} />
        <Route path="/explain" element={<Explain />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/experiments" element={<Experiments />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
