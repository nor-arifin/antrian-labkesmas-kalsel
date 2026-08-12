import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import PinGate from '../components/PinGate';

export default function Counter() {
  const { id } = useParams();
  const [counter, setCounter] = useState(null);
  const [currentQueue, setCurrentQueue] = useState(null);
  const [nextQueue, setNextQueue] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [servingStartedAt, setServingStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);
  const { on } = useSocket();

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    if (!servingStartedAt) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - servingStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [servingStartedAt]);

  useEffect(() => {
    const unsubs = [
      on('queue:calling', ({ queue }) => {
        if (queue.counter_id === parseInt(id)) {
          setCurrentQueue(queue);
          setNextQueue(null);
        }
        loadData();
      }),
      on('queue:updated', ({ queue }) => {
        if (queue.counter_id === parseInt(id) && queue.status === 'done') {
          setCurrentQueue(null);
          loadNext();
        }
      }),
      on('counter:updated', ({ counter: c }) => {
        if (c && c.id === parseInt(id)) {
          setCounter(prev => ({ ...prev, status: c.status }));
        }
      }),
      on('system:reset', () => { setCurrentQueue(null); setNextQueue(null); setHistory([]); }),
    ];
    return () => unsubs.forEach(u => u());
  }, [on, id]);

  async function loadData() {
    try {
      const [c, a, h] = await Promise.all([api.getCounters(), api.getActive(), api.getHistory(parseInt(id))]);
      const myCounter = c.data.find(x => x.id === parseInt(id));
      setCounter(myCounter);
      const serving = a.data.find(q => q.counter_id === parseInt(id) && (q.status === 'serving' || q.status === 'calling'));
      setCurrentQueue(serving);
      setHistory(h.data || []);
    } catch (err) { console.error(err); }
  }

  async function loadNext() {
    try {
      const c = await api.getCounters();
      const myCounter = c.data.find(x => x.id === parseInt(id));
      if (myCounter?.service_id) {
        const a = await api.getActive();
        const waiting = a.data.filter(q => q.service_id === myCounter.service_id && q.status === 'waiting');
        setNextQueue(waiting[0] || null);
      }
    } catch (err) { console.error(err); }
  }

  async function handleNext() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.getNext(parseInt(id));
      if (res.data) { setCurrentQueue(res.data); setNextQueue(null); }
    } catch (err) { alert('Gagal: ' + err.message); } finally { setLoading(false); }
  }

  async function handleStatus(status) {
    if (!currentQueue || loading) return;
    setLoading(true);
    try {
      await api.updateStatus(currentQueue.id, status);
      if (status === 'serving') {
        setServingStartedAt(Date.now());
      } else {
        setServingStartedAt(null);
        setElapsedSeconds(0);
      }
      setCurrentQueue(null);
      await loadData(); await loadNext();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setLoading(false); }
  }

  async function handleRecall() {
    if (!currentQueue || loading) return;
    setLoading(true);
    try {
      await api.recallQueue(currentQueue.id);
    } catch (err) { alert('Gagal: ' + err.message); } finally { setLoading(false); }
  }

  async function handleToggleBreak() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.toggleBreak(parseInt(id));
      setCounter(prev => ({ ...prev, status: res.data.status }));
    } catch (err) { alert('Gagal: ' + err.message); } finally { setLoading(false); }
  }

  const onBreak = counter?.status === 'break';

  if (!counter) return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-gray-500"><p className="text-xl animate-pulse">Memuat data loket...</p></div>;

  return (
    <PinGate pageName="Counter">
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="bg-gradient-to-r from-[#11B9A0] to-[#0d9488] text-white py-5 px-8 flex items-center gap-4 shadow-lg">
        <img src="/logo/antian_logo.svg" alt="Logo" className="w-12 h-12 drop-shadow-md" />
        <div className="flex-1">
          <h1 className="text-2xl font-black">{counter.name}</h1>
          <p className="text-sm text-white/70">{counter.service_name}</p>
        </div>
        {onBreak && (
          <span className="bg-amber-400 text-amber-900 px-4 py-2 rounded-xl text-sm font-bold shadow-md">
            ☕ ISTIRAHAT
          </span>
        )}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
        <div className="flex-1 flex flex-col gap-5">
          <div className={`bg-white rounded-2xl p-8 shadow-lg text-center border ${onBreak ? 'border-amber-300' : 'border-gray-100'}`}>
            <p className="text-sm text-gray-400 mb-3 uppercase tracking-widest font-semibold">Nomor Saat Ini</p>
            {onBreak ? (
              <div className="text-[80px] font-black text-amber-500 leading-none animate-pulse">ISTIRAHAT</div>
            ) : currentQueue ? (
              <div className="text-[100px] font-black text-[#11B9A0] leading-none">{currentQueue.queue_number}</div>
            ) : (
              <div className="text-[100px] font-black text-gray-200 leading-none">---</div>
            )}
            {!onBreak && currentQueue?.priority > 0 && (
              <p className="text-amber-500 mt-3 font-bold text-lg">
                {currentQueue.priority === 3 ? 'Prioritas Cito' : currentQueue.priority === 1 ? 'Prioritas Lansia' : 'Prioritas Ibu Hamil'}
              </p>
            )}
            {servingStartedAt && (
              <p className="text-emerald-600 mt-3 text-4xl font-black">{formatTime(elapsedSeconds)}</p>
            )}
          </div>

          {!onBreak && (
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center border border-gray-100">
              <p className="text-sm text-gray-400 mb-2 uppercase tracking-widest font-semibold">Nomor Berikutnya</p>
              {nextQueue ? (
                <div className="text-5xl font-bold text-gray-400">{nextQueue.queue_number}</div>
              ) : (
                <div className="text-5xl font-bold text-gray-200">---</div>
              )}
            </div>
          )}

          {onBreak ? (
            <button
              onClick={handleToggleBreak}
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white text-2xl font-black py-7 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              ☕ KEMBALI BEKERJA
            </button>
          ) : (
            <>
              <button
                onClick={handleNext}
                disabled={loading || !!currentQueue}
                className="w-full bg-gradient-to-r from-[#11B9A0] to-[#0d9488] hover:from-[#0ea5a0] hover:to-[#0b8578] text-white text-2xl font-black py-7 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                PANGGIL
              </button>

              {currentQueue && currentQueue.status === 'calling' && (
                <button
                  onClick={handleRecall}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white text-xl font-bold py-5 rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                >
                  🔄 PANGGIL ULANG
                </button>
              )}

              {currentQueue && (
                <div className="flex gap-4">
                  <button onClick={() => handleStatus('serving')} disabled={loading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold py-5 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]">
                    MULAI
                  </button>
                  <button onClick={() => handleStatus('skip')} disabled={loading}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xl font-bold py-5 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]">
                    LEWATI
                  </button>
                  <button onClick={() => handleStatus('done')} disabled={loading}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-xl font-bold py-5 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]">
                    SELESAI
                  </button>
                </div>
              )}

              <button
                onClick={handleToggleBreak}
                disabled={loading || !!currentQueue}
                className="w-full bg-amber-400 hover:bg-amber-500 text-amber-900 text-xl font-bold py-5 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                ☕ ISTIRAHAT
              </button>
            </>
          )}
        </div>

        <div className="lg:w-80 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
            <span className="w-2 h-2 bg-[#11B9A0] rounded-full"></span>
            Riwayat Hari Ini
          </h3>
          {history.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Belum ada riwayat</p>
          ) : (
            <div className="space-y-2">
              {history.map(q => (
                <div key={q.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-bold text-gray-700">{q.queue_number}</span>
                  <div className="flex items-center gap-2">
                    {q.service_duration_minutes != null && (
                      <span className="text-xs text-gray-500 font-semibold">{q.service_duration_minutes} mnt</span>
                    )}
                    <span className={`text-xs px-3 py-1 rounded-lg font-semibold ${
                      q.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                      q.status === 'skip' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {q.status === 'done' ? 'Selesai' : q.status === 'skip' ? 'Lewati' : q.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </PinGate>
  );
}
