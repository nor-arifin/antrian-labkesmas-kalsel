import { Routes, Route, Navigate } from 'react-router-dom';
import Kiosk from './pages/Kiosk';
import Display from './pages/Display';
import Counter from './pages/Counter';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/kiosk" replace />} />
      <Route path="/kiosk" element={<Kiosk />} />
      <Route path="/display" element={<Display />} />
      <Route path="/counter/:id" element={<Counter />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
