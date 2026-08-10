import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';

export default function Display() {
  const [counters, setCounters] = useState([]);
  const [queues, setQueues] = useState([]);
  const [stats, setStats] = useState({});
  const [announcement, setAnnouncement] = useState(null);
  const [runningText, setRunningText] = useState('');
  const { on } = useSocket();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const unsubs = [
      on('queue:calling', ({ queue }) => {
        setAnnouncement(queue);
        setTimeout(() => setAnnouncement(null), 10000);
        loadData();
      }),
      on('queue:updated', () => loadData()),
      on('counter:updated', () => loadData()),
      on('queue:created', () => loadData()),
      on('stats:updated', ({ stats: s }) => setStats(s)),
      on('system:reset', () => { setQueues([]); setCounters([]); setStats({}); }),
      on('settings:updated', ({ key, value }) => {
        if (key === 'running_text') setRunningText(value);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [on]);

  async function loadData() {
    try {
      const [c, q, s, settings] = await Promise.all([api.getCounters(), api.getActive(), api.getStats(), api.getSettings()]);
      setCounters(c.data); setQueues(q.data); setStats(s.data);
      if (settings.data.running_text !== undefined) setRunningText(settings.data.running_text);
    } catch (err) { console.error(err); }
  }

  const waitingQueues = queues.filter(q => q.status === 'waiting');

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800 flex flex-col">
      <header className="bg-gradient-to-r from-[#11B9A0] to-[#0d9488] py-6 px-10 flex items-center gap-6 shadow-lg">
        <img src="/logo/antian_logo.svg" alt="Logo" className="w-16 h-16 drop-shadow-md" />
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">LAB. KESEHATAN PROV. KALIMANTAN SELATAN</h1>
          <p className="text-base text-white/70">Sistem Antrian Digital</p>
        </div>
      </header>

      {announcement && (
        <div className="bg-[#11B9A0] text-white py-5 px-10 text-center animate-pulse shadow-lg">
          <span className="text-3xl font-black tracking-wide">
            NOMOR {announcement.queue_number} - SILAKAN KE LOKET
          </span>
        </div>
      )}

      <div className="flex-1 p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {counters.filter(c => c.is_active).map(counter => {
            const activeQueue = queues.find(q => q.counter_id === counter.id && q.status === 'serving');
            const callingQueue = queues.find(q => q.counter_id === counter.id && q.status === 'calling');
            const isBreak = counter.status === 'break';

            return (
              <div key={counter.id} className={`bg-white rounded-3xl p-8 text-center shadow-lg border-2 ${isBreak ? 'border-amber-300' : 'border-gray-200'} hover:shadow-xl transition-shadow`}>
                <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-white text-lg font-bold shadow-md" style={{ backgroundColor: counter.service_color }}>
                  {counter.service_prefix}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">{counter.name}</h3>
                <p className="text-sm text-gray-400 mb-5">{counter.service_name}</p>
                {isBreak ? (
                  <div className="text-5xl font-black text-amber-500 animate-pulse">ISTIRAHAT</div>
                ) : activeQueue ? (
                  <div className="text-7xl font-black text-gray-800 drop-shadow-sm">{activeQueue.queue_number}</div>
                ) : callingQueue ? (
                  <div className="text-7xl font-black text-gray-800 animate-pulse">{callingQueue.queue_number}</div>
                ) : (
                  <div className="text-7xl font-black text-gray-200">---</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-200">
          <h3 className="text-2xl font-bold mb-5 flex items-center gap-3 text-gray-800">
            <span className="w-4 h-4 bg-[#11B9A0] rounded-full animate-pulse"></span>
            Antrian Menunggu
          </h3>
          {waitingQueues.length === 0 ? (
            <p className="text-gray-400 text-center py-10 text-xl">Tidak ada antrian</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {waitingQueues.slice(0, 40).map(q => (
                <div key={q.id} className={`px-5 py-3 rounded-xl text-xl font-bold shadow-sm ${
                  q.priority > 0
                    ? 'bg-amber-400 text-amber-900 border-2 border-amber-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                }`}>
                  {q.queue_number}
                  {q.priority > 0 && <span className="text-sm ml-1 opacity-70">{q.priority === 1 ? ' Lansia' : ' Hamil'}</span>}
                </div>
              ))}
              {waitingQueues.length > 40 && (
                <div className="px-5 py-3 rounded-xl text-xl bg-gray-100 text-gray-500 border-2 border-gray-200">
                  +{waitingQueues.length - 40} lagi
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {runningText && (
        <div className="bg-[#11B9A0] py-3 overflow-hidden">
          <div className="marquee whitespace-nowrap">
            <span className="text-white text-lg font-semibold inline-block px-8">{runningText}</span>
          </div>
        </div>
      )}

      <footer className="bg-white py-4 px-10 flex justify-between text-base text-gray-500 border-t-2 border-gray-200">
        <span>Total: {stats.total || 0}</span>
        <span>Dilayani: {stats.done || 0}</span>
        <span>Rata-rata tunggu: {stats.avg_wait_minutes || 0} mnt</span>
      </footer>
    </div>
  );
}
