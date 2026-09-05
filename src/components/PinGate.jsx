import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

export default function PinGate({ children, pageName = 'Aplikasi' }) {
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [serverPin, setServerPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    api.getSettings().then(res => {
      const pinFromServer = res.data.dashboard_pin || '101010';
      setServerPin(pinFromServer);
      if (localStorage.getItem('app_pin') === pinFromServer) {
        setIsAuthenticated(true);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAuthenticated, loading]);

  function handleSubmit(e) {
    e.preventDefault();
    if (pin === serverPin) {
      localStorage.setItem('app_pin', pin);
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('PIN salah');
      setPin('');
    }
  }

  function handleLogout() {
    localStorage.removeItem('app_pin');
    setIsAuthenticated(false);
    setPin('');
    setPinError('');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-xl text-gray-400 animate-pulse">Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d9488] via-[#11B9A0] to-[#65a30d] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute w-[300px] h-[300px] rounded-full bg-white top-[-50px] left-[-80px]"></div>
          <div className="absolute w-[200px] h-[200px] rounded-full bg-[#d3dd03] bottom-[-40px] right-[-40px]"></div>
        </div>
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center relative z-10">
          <img src="/logo/logoui.png" alt="Logo" className="w-20 h-20 mx-auto mb-6 drop-shadow-md" />
          <h1 className="text-xl font-black text-gray-800 mb-1">Sistem Antrian Digital</h1>
          <p className="text-sm text-gray-400 mb-8">Labkesda Kalsel</p>
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-gray-500 mb-3">Masukkan PIN Akses</label>
            <input
              ref={inputRef}
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(''); }}
              maxLength={6}
              placeholder="••••••"
              className="w-full text-center text-3xl tracking-[0.5em] font-bold border-2 border-gray-200 rounded-2xl px-4 py-4 mb-2 focus:border-[#11B9A0] focus:ring-2 focus:ring-[#11B9A0]/30 outline-none transition"
            />
            {pinError && <p className="text-red-500 text-sm font-semibold mb-2">{pinError}</p>}
            <button type="submit"
              className="w-full bg-gradient-to-r from-[#11B9A0] to-[#0d9488] hover:from-[#0ea5a0] hover:to-[#0b8578] text-white text-lg font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl mt-4">
              🔓 Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      {children}
      <button
        onClick={handleLogout}
        className="fixed bottom-4 right-4 z-50 bg-gray-800/80 hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transition"
        title="Logout PIN"
      >
        🔓 PIN
      </button>
    </div>
  );
}
