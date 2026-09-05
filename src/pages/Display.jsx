import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { useAudio } from '../hooks/useAudio';
import PinGate from '../components/PinGate';

export default function Display() {
  const [counters, setCounters] = useState([]);
  const [queues, setQueues] = useState([]);
  const [stats, setStats] = useState({});
  const [announcement, setAnnouncement] = useState(null);
  const [runningText, setRunningText] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const audioEnabledRef = useRef(false);
  const pendingAudioRef = useRef(null);
  const { on } = useSocket();
  const { playSequence } = useAudio();

  const enableAudio = useCallback(() => {
    audioEnabledRef.current = true;
    setAudioEnabled(true);
    if (pendingAudioRef.current) {
      playSequence(pendingAudioRef.current);
      pendingAudioRef.current = null;
    }
  }, [playSequence]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const unsubs = [
      on('queue:calling', ({ queue, audio }) => {
        setAnnouncement(queue);
        if (audio) {
          if (audioEnabledRef.current) {
            playSequence(audio);
          } else {
            pendingAudioRef.current = audio;
          }
        }
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
        if (key === 'video_enabled') setVideoEnabled(value === '1');
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [on]);

  async function loadData() {
    try {
      const [c, q, s, settings] = await Promise.all([api.getCounters(), api.getActive(), api.getStats(), api.getSettings()]);
      setCounters(c.data); setQueues(q.data); setStats(s.data);
      if (settings.data.running_text !== undefined) setRunningText(settings.data.running_text);
      setVideoEnabled(settings.data.video_enabled === '1');
      setVideoUrl(settings.data.video_url || null);
    } catch (err) { console.error(err); }
  }

  const waitingQueues = queues.filter(q => q.status === 'waiting');
  const showVideo = videoEnabled && videoUrl;

  return (
    <PinGate pageName="Display">
      <div className="min-h-screen bg-[#f8fafc] text-gray-800 flex flex-col relative" onClick={!audioEnabled ? enableAudio : undefined}>
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-md mx-4 animate-pulse">
            <div className="text-6xl mb-4">🔊</div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Aktifkan Suara Panggilan</h2>
            <p className="text-gray-500">Klik di mana saja pada layar untuk mengaktifkan suara antrian</p>
          </div>
        </div>
      )}
      <header className="bg-gradient-to-r from-[#11B9A0] to-[#0d9488] py-4 px-8 flex items-center gap-5 shadow-lg">
        <img src="/logo/logoui.png" alt="Logo" className="w-14 h-14 drop-shadow-md" />
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">LABORATORIUM KESEHATAN PROV. KALIMANTAN SELATAN</h1>
          <p className="text-sm text-white/70">Sistem Antrian Digital</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col p-6 gap-4">
        <div className={`flex gap-4 ${showVideo ? 'h-80 lg:h-96' : ''}`}>
          <div className={`bg-[#EA580C] text-white text-center flex flex-col items-center justify-center shadow-lg ${
            showVideo ? 'w-1/3 rounded-2xl' : 'w-full rounded-2xl'
          }`}>
            {announcement ? (
              <>
                <p className="text-sm uppercase tracking-widest mb-2 opacity-80">Nomor Antrian</p>
                <span className="text-5xl lg:text-6xl font-black">{announcement.queue_number}</span>
                <p className="text-lg mt-2 font-bold">SILAKAN KE LOKET {announcement.counter_name}</p>
              </>
            ) : (
              <span className="text-4xl lg:text-5xl font-black text-white/40">ANTRIAN LAYANAN LOKET</span>
            )}
          </div>

          {showVideo && (
            <div className="w-2/3 aspect-[4/3] rounded-2xl overflow-hidden shadow-lg bg-black flex items-center justify-center">
              <video
                src={videoUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {counters.filter(c => c.is_active).map(counter => {
            const activeQueue = queues.find(q => q.counter_id === counter.id && q.status === 'serving');
            const callingQueue = queues.find(q => q.counter_id === counter.id && q.status === 'calling');
            const isBreak = counter.status === 'break';

            return (
              <div key={counter.id} className={`bg-white rounded-2xl p-6 text-center shadow-md border-2 min-h-[300px] lg:min-h-[350px] flex flex-col justify-center ${isBreak ? 'border-amber-400' : 'border-gray-300'}`}>
                <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center text-white text-base font-bold" style={{ backgroundColor: counter.service_color }}>
                  {counter.service_prefix}
                </div>
                <h3 className="text-2xl font-bold text-gray-800">{counter.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{counter.service_name}</p>
                {isBreak ? (
                  <div className="text-5xl font-black text-amber-500 animate-pulse">ISTIRAHAT</div>
                ) : activeQueue ? (
                  <div className="text-6xl font-black text-gray-800">{activeQueue.queue_number}</div>
                ) : callingQueue ? (
                  <div className="text-6xl font-black text-gray-800 animate-pulse">{callingQueue.queue_number}</div>
                ) : (
                  <div className="text-6xl font-black text-gray-200">---</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-200">
          <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-gray-800">
            <span className="w-3 h-3 bg-[#11B9A0] rounded-full animate-pulse"></span>
            Antrian Menunggu
          </h3>
          {waitingQueues.length === 0 ? (
            <p className="text-gray-400 text-center py-4 text-sm">Tidak ada antrian</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {waitingQueues.slice(0, 50).map(q => (
                <div key={q.id} className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm ${
                  q.priority > 0
                    ? 'bg-amber-400 text-amber-900 border border-amber-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {q.queue_number}
                  {q.priority > 0 && <span className="text-xs ml-0.5 opacity-70">{q.priority === 3 ? ' Cito' : q.priority === 1 ? ' Lansia' : ' Hamil'}</span>}
                </div>
              ))}
              {waitingQueues.length > 50 && (
                <div className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-500 border border-gray-200">
                  +{waitingQueues.length - 50} lagi
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {runningText && (
        <div className="bg-[#11B9A0] py-2 overflow-hidden">
          <div className="marquee whitespace-nowrap">
            <span className="text-white text-sm font-semibold inline-block px-8">{runningText}</span>
          </div>
        </div>
      )}

      <footer className="bg-white py-3 px-8 flex justify-between text-sm text-gray-500 border-t border-gray-200">
        <span>Total: {stats.total || 0}</span>
        <span>Dilayani: {stats.done || 0}</span>
        <span>Rata-rata tunggu: {stats.avg_wait_minutes || 0} mnt</span>
      </footer>
    </div>
    </PinGate>
  );
}
