import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { printTicket } from '../lib/printer';
import PinGate from '../components/PinGate';

function FloatingCircles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute w-[300px] h-[300px] rounded-full bg-white/5 top-[-50px] left-[-80px]" style={{ animation: 'float1 18s ease-in-out infinite' }}></div>
      <div className="absolute w-[200px] h-[200px] rounded-full bg-white/8 top-[20%] right-[-40px]" style={{ animation: 'float2 14s ease-in-out infinite' }}></div>
      <div className="absolute w-[150px] h-[150px] rounded-full bg-white/6 bottom-[15%] left-[10%]" style={{ animation: 'float3 20s ease-in-out infinite' }}></div>
      <div className="absolute w-[100px] h-[100px] rounded-full bg-white/10 top-[40%] left-[60%]" style={{ animation: 'float4 12s ease-in-out infinite' }}></div>
      <div className="absolute w-[250px] h-[250px] rounded-full bg-white/4 bottom-[-60px] right-[20%]" style={{ animation: 'float5 16s ease-in-out infinite' }}></div>
      <div className="absolute w-[80px] h-[80px] rounded-full bg-[#d3dd03]/10 top-[60%] left-[30%]" style={{ animation: 'float6 10s ease-in-out infinite' }}></div>
      <div className="absolute w-[120px] h-[120px] rounded-full bg-[#11B9A0]/10 top-[10%] left-[40%]" style={{ animation: 'pulse-slow 8s ease-in-out infinite' }}></div>
      <div className="absolute w-[60px] h-[60px] rounded-full bg-[#d3dd03]/8 bottom-[30%] right-[40%]" style={{ animation: 'float1 11s ease-in-out infinite reverse' }}></div>
    </div>
  );
}

export default function Kiosk() {
  const [services, setServices] = useState([]);
  const [priority, setPriority] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const { on } = useSocket();

  useEffect(() => {
    api.getServices().then(d => setServices(d.data.filter(s => s.is_active)));
    api.getStats().then(d => setWaitingCount(d.data?.waiting || 0));
  }, []);

  useEffect(() => {
    return on('stats:updated', ({ stats }) => {
      setWaitingCount(stats?.waiting || 0);
    });
  }, [on]);

  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => setResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const handleTake = async (serviceId) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.takeQueue(serviceId, priority);
      setResult(res.data);
      await printTicket(res.data.id);
    } catch (err) {
      alert('Gagal mengambil nomor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <PinGate pageName="Kiosk">
        <div className="min-h-screen flex flex-col items-center justify-center text-white p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #11B9A0 30%, #65a30d 70%, #d3dd03 100%)' }}>
          <FloatingCircles />
          <div className="text-center relative z-10">
            <div className="mb-6">
              <img src="/logo/antian_logo.svg" alt="Logo" className="w-28 h-28 mx-auto drop-shadow-2xl" />
            </div>
            <p className="text-2xl mb-4 opacity-80">Nomor Antrian Anda</p>
            <div className="text-[120px] font-black leading-none tracking-tight drop-shadow-lg" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>{result.queue_number}</div>
            <div className="mt-6 bg-white/15 backdrop-blur-sm rounded-2xl px-8 py-4 inline-block border border-white/20">
              <p className="text-2xl">Antrian di depan: <span className="font-bold">{waitingCount}</span> orang</p>
            </div>
            <p className="text-lg mt-6 opacity-60 animate-pulse">Tiket sedang dicetak...</p>
          </div>
        </div>
      </PinGate>
    );
  }

  return (
    <PinGate pageName="Kiosk">
      <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #11B9A0 30%, #65a30d 70%, #d3dd03 100%)' }}>
      <FloatingCircles />

      <header className="text-white text-center py-10 px-4 relative z-10">
        <div className="mb-4">
          <img src="/logo/antian_logo.svg" alt="Logo" className="w-24 h-24 mx-auto drop-shadow-2xl" />
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-1" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>LABORATORIUM KESEHATAN</h1>
        <h2 className="text-2xl font-light opacity-90">PROVINSI KALIMANTAN SELATAN</h2>
        <div className="w-32 h-1 bg-white/40 mx-auto mt-4 rounded-full"></div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10 relative z-10">
        <p className="text-white/70 text-xl mb-8">Silakan pilih jenis layanan</p>

        <div className="grid grid-cols-2 gap-5 w-full max-w-2xl mb-10">
          {services.map((service, i) => (
            <button
              key={service.id}
              onClick={() => handleTake(service.id)}
              disabled={loading}
              className="group bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(17,185,160,0.4)] transform hover:scale-[1.03] transition-all duration-300 disabled:opacity-50 disabled:cursor-wait min-h-[160px] flex flex-col items-center justify-center cursor-pointer"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div
                className="w-20 h-20 rounded-2xl mb-4 flex items-center justify-center text-white text-4xl font-black shadow-lg group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: service.color, boxShadow: `0 8px 25px ${service.color}66` }}
              >
                {service.prefix}
              </div>
              <span className="text-xl font-bold text-gray-800">{service.name}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          {[
            { label: 'Normal', value: 0, icon: '👤' },
            { label: 'Lansia', value: 1, icon: '👴' },
            { label: 'Ibu Hamil', value: 2, icon: '🤰' },
            { label: 'Cito', value: 3, icon: '🚨' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setPriority(p.value)}
              className={`px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 ${
                priority === p.value
                  ? 'bg-white text-[#0d9488] shadow-xl scale-105 ring-4 ring-white/30'
                  : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur border border-white/20'
              }`}
            >
              <span className="mr-2">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-10 text-center shadow-2xl">
            <div className="w-16 h-16 border-4 border-[#11B9A0] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-700">Memproses...</p>
          </div>
        </div>
      )}
    </div>
    </PinGate>
  );
}
