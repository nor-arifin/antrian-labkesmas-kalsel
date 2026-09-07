import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { useAudio } from '../hooks/useAudio';
import PinGate from '../components/PinGate';

function getContrastText(hex) {
  const c = (hex || '#000000').replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#1a1a1a' : '#ffffff';
}

const THEMES = {
  dark: {
    root: 'bg-gradient-to-br from-[#0e7490] via-[#0d9488] to-[#14b8a6] text-white',
    glow1: 'bg-white/15',
    glow2: 'bg-amber-300/20',
    glow3: 'bg-teal-100/20',
    header: 'bg-gradient-to-r from-[#0f766e] to-[#115e59]',
    headerSub: 'text-white/75',
    clockTime: 'text-white',
    clockDate: 'text-white/70',
    annIdle: 'bg-white/15 border-white/30 shadow-2xl',
    annIdleText: 'text-white',
    annIdleSub: 'text-white/90',
    cardBase: 'bg-white/15 border-white/30',
    cardBreak: 'border-amber-300',
    cardServing: 'border-white/70',
    cardCalling: 'border-[#fed7aa]',
    cardIdle: 'border-white/15',
    name: 'text-white',
    serviceName: 'text-white/70',
    numBreak: 'text-amber-300',
    labelBreak: 'text-amber-300/90',
    numServing: 'text-white',
    labelServing: 'text-white/80',
    numCalling: 'text-[#ffedd5]',
    labelCalling: 'text-[#ffedd5]',
    numIdle: 'text-white/30',
    labelIdle: 'text-white/50',
    waitPanel: 'bg-white/15 border-white/30',
    waitTitle: 'text-white',
    countBadge: 'bg-white/25 text-white',
    chipNormal: 'bg-white/25 text-white border-white/40',
    chipPriority: 'bg-amber-400 text-amber-950 border-amber-300',
    chipMore: 'bg-white/15 text-white/70 border-white/30',
    empty: 'text-white/60',
    footer: 'bg-white/10 border-white/20',
    footerLabel: 'text-white/60',
    footerValue: 'text-white',
  },
  light: {
    root: 'bg-gradient-to-br from-[#ccfbf1] via-[#f0fdfa] to-[#e6fffb] text-[#134e4a]',
    glow1: 'bg-[#0d9488]/10',
    glow2: 'bg-[#EA580C]/10',
    glow3: 'bg-[#2DD4BF]/20',
    header: 'bg-gradient-to-r from-[#0d9488] to-[#0f766e]',
    headerSub: 'text-white/80',
    clockTime: 'text-white',
    clockDate: 'text-white/75',
    annIdle: 'bg-white border-[#0d9488]/25 shadow-2xl',
    annIdleText: 'text-[#0f766e]',
    annIdleSub: 'text-[#134e4a]/80',
    cardBase: 'bg-white border-[#0d9488]/25',
    cardBreak: 'border-amber-400',
    cardServing: 'border-[#0d9488]',
    cardCalling: 'border-[#F97316]',
    cardIdle: 'border-gray-200',
    name: 'text-gray-900',
    serviceName: 'text-gray-500',
    numBreak: 'text-amber-500',
    labelBreak: 'text-amber-500',
    numServing: 'text-[#0d9488]',
    labelServing: 'text-[#0d9488]',
    numCalling: 'text-[#EA580C]',
    labelCalling: 'text-[#EA580C]',
    numIdle: 'text-gray-300',
    labelIdle: 'text-gray-400',
    waitPanel: 'bg-white border-[#0d9488]/25',
    waitTitle: 'text-gray-900',
    countBadge: 'bg-[#0d9488]/10 text-[#0f766e]',
    chipNormal: 'bg-[#0d9488]/10 text-[#0f766e] border-[#0d9488]/25',
    chipPriority: 'bg-amber-400 text-amber-950 border-amber-300',
    chipMore: 'bg-gray-100 text-gray-500 border-gray-200',
    empty: 'text-gray-500',
    footer: 'bg-white border-[#0d9488]/15',
    footerLabel: 'text-gray-500',
    footerValue: 'text-gray-900',
  },
};

export default function Display() {
  const [counters, setCounters] = useState([]);
  const [queues, setQueues] = useState([]);
  const [stats, setStats] = useState({});
  const [announcement, setAnnouncement] = useState(null);
  const [runningText, setRunningText] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [now, setNow] = useState(new Date());
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
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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
        if (key === 'display_theme') setTheme(value === 'light' ? 'light' : 'dark');
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
      setTheme(settings.data.display_theme === 'light' ? 'light' : 'dark');
    } catch (err) { console.error(err); }
  }

  const waitingQueues = queues.filter(q => q.status === 'waiting');
  const showVideo = videoEnabled && videoUrl;
  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const t = THEMES[theme] || THEMES.dark;

  return (
    <PinGate pageName="Display">
      <div
        className={`relative min-h-screen overflow-hidden flex flex-col ${t.root}`}
        onClick={!audioEnabled ? enableAudio : undefined}
      >
        <div className={`absolute w-[320px] h-[320px] rounded-full ${t.glow1} blur-3xl top-[8%] right-[5%] pointer-events-none select-none`} style={{ animation: 'float1 14s ease-in-out infinite' }}></div>
        <div className={`absolute w-[260px] h-[260px] rounded-full ${t.glow2} blur-3xl bottom-[20%] left-[2%] pointer-events-none select-none`} style={{ animation: 'float2 16s ease-in-out infinite' }}></div>
        <div className={`absolute w-[200px] h-[200px] rounded-full ${t.glow3} blur-3xl top-[45%] right-[35%] pointer-events-none select-none`} style={{ animation: 'pulse-slow 10s ease-in-out infinite' }}></div>

        {!audioEnabled && (
          <div className="fixed inset-0 z-50 bg-[#03211d]/85 backdrop-blur-md flex items-center justify-center cursor-pointer">
            <div className="bg-white/10 border border-white/20 rounded-3xl p-10 text-center shadow-2xl max-w-md mx-4 animate-pulse">
              <div className="text-6xl mb-4">🔊</div>
              <h2 className="text-2xl font-black text-white mb-2">Aktifkan Suara Panggilan</h2>
              <p className="text-white/70">Klik di mana saja pada layar untuk mengaktifkan suara antrian</p>
            </div>
          </div>
        )}

        <header className={`relative z-10 ${t.header} py-4 px-8 flex items-center gap-5 shadow-xl`}>
          <img src="/logo/logoui.png" alt="Logo" className="w-14 h-14 drop-shadow-md" />
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight text-white">LABORATORIUM KESEHATAN PROV. KALIMANTAN SELATAN</h1>
            <p className={`text-sm ${t.headerSub} font-semibold`}>Sistem Antrian Digital</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black ${t.clockTime} tabular-nums leading-none tracking-tight`}>{time}</div>
            <div className={`text-sm ${t.clockDate} capitalize`}>{date}</div>
          </div>
        </header>

        <div className="relative z-10 flex-1 flex flex-col p-6 gap-5">
          <div className={`flex gap-4 ${showVideo ? 'h-80 lg:h-96' : ''}`}>
            <div className={`flex flex-col items-center justify-center text-center overflow-hidden ${
              showVideo ? 'w-1/3 rounded-3xl' : 'w-full rounded-3xl'
            } ${
              announcement
                ? 'bg-gradient-to-br from-[#EA580C] to-[#c2410c] border-2 border-[#FDBA74]/40 shadow-2xl'
                : `border ${t.annIdle}`
            }`}>
              {announcement ? (
                <>
                  <span className="bg-white/20 text-white text-sm font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3 animate-pulse">SEDANG DIPANGGIL</span>
                  <p className="text-base uppercase tracking-widest mb-1 text-white/85 font-bold">Nomor Antrian</p>
                  <span className="text-8xl lg:text-9xl font-black tracking-tight text-white leading-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
                    {announcement.queue_number}
                  </span>
                  <p className="text-3xl lg:text-4xl mt-4 font-black text-white">SILAKAN KE LOKET {announcement.counter_name}</p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className={`text-6xl lg:text-8xl font-black tracking-tight ${t.annIdleText}`}>ANTRIAN LAYANAN</span>
                  <div className={`flex items-center gap-2 ${t.annIdleSub}`}>
                    <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse"></span>
                    <span className="text-lg font-bold">Menunggu pemanggilan...</span>
                  </div>
                </div>
              )}
            </div>

            {showVideo && (
              <div className="w-2/3 aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl bg-black/40 border border-white/10 flex items-center justify-center">
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {counters.filter(c => c.is_active).map(counter => {
              const activeQueue = queues.find(q => q.counter_id === counter.id && q.status === 'serving');
              const callingQueue = queues.find(q => q.counter_id === counter.id && q.status === 'calling');
              const currentQueue = queues.find(q => q.id === counter.current_queue_id && (q.status === 'serving' || q.status === 'calling'));
              const isBreak = counter.status === 'break';
              const badgeColor = counter.service_color || '#0d9488';

              const state = isBreak ? 'break'
                : activeQueue ? 'serving'
                : callingQueue ? 'calling'
                : currentQueue ? (currentQueue.status === 'serving' ? 'serving' : 'calling')
                : 'idle';

              return (
                <div
                  key={counter.id}
                  className={`${t.cardBase} backdrop-blur-sm rounded-3xl p-5 text-center border-2 min-h-[300px] lg:min-h-[340px] flex flex-col items-center justify-center shadow-xl transition-colors duration-300 ${
                    state === 'break'
                      ? t.cardBreak
                      : state === 'serving'
                        ? t.cardServing
                        : state === 'calling'
                          ? t.cardCalling
                          : t.cardIdle
                  }`}
                >
                  <div
                    className="w-14 h-14 rounded-2xl mb-3 flex items-center justify-center text-xl font-black shadow-lg"
                    style={{ backgroundColor: badgeColor, color: getContrastText(badgeColor) }}
                  >
                    {counter.service_prefix}
                  </div>
                  <h3 className={`text-2xl font-black tracking-tight ${t.name}`}>{counter.name}</h3>
                  <p className={`text-sm font-semibold mb-3 ${t.serviceName}`}>{counter.service_name}</p>
                  {state === 'break' ? (
                    <>
                      <div className={`text-5xl font-black animate-pulse tracking-tight ${t.numBreak}`}>ISTIRAHAT</div>
                      <p className={`mt-3 text-xs font-bold uppercase tracking-widest ${t.labelBreak}`}>Loket Tutup</p>
                    </>
                  ) : state === 'serving' ? (
                    <>
                      <div className={`text-6xl lg:text-7xl font-black tracking-tight leading-none ${t.numServing}`}>{(activeQueue || currentQueue).queue_number}</div>
                      <p className={`mt-3 text-xs font-bold uppercase tracking-widest ${t.labelServing}`}>Sedang Dilayani</p>
                    </>
                  ) : state === 'calling' ? (
                    <>
                      <div className={`text-6xl lg:text-7xl font-black tracking-tight leading-none animate-pulse ${t.numCalling}`}>{(callingQueue || currentQueue).queue_number}</div>
                      <p className={`mt-3 text-xs font-bold uppercase tracking-widest ${t.labelCalling}`}>Dipanggil</p>
                    </>
                  ) : (
                    <>
                      <div className={`text-6xl lg:text-7xl font-black tracking-tight leading-none ${t.numIdle}`}>---</div>
                      <p className={`mt-3 text-xs font-bold uppercase tracking-widest ${t.labelIdle}`}>Menunggu</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className={`${t.waitPanel} backdrop-blur-sm rounded-3xl p-5 border`}>
            <h3 className={`text-xl font-black mb-4 flex items-center gap-3 ${t.waitTitle}`}>
              <span className="w-3.5 h-3.5 bg-[#2DD4BF] rounded-full animate-pulse"></span>
              Antrian Menunggu
              <span className={`${t.countBadge} text-sm font-black px-3 py-1 rounded-full tabular-nums`}>{waitingQueues.length}</span>
            </h3>
            {waitingQueues.length === 0 ? (
              <p className={`${t.empty} text-center py-5 text-lg font-semibold`}>Tidak ada antrian</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {waitingQueues.slice(0, 50).map(q => (
                  <div key={q.id} className={`px-4 py-2 rounded-xl text-lg font-black shadow-lg border ${
                    q.priority > 0 ? t.chipPriority : t.chipNormal
                  }`}>
                    {q.queue_number}
                    {q.priority > 0 && <span className="text-xs ml-1 opacity-80 font-bold">{q.priority === 3 ? 'Cito' : q.priority === 1 ? 'Lansia' : 'Hamil'}</span>}
                  </div>
                ))}
                {waitingQueues.length > 50 && (
                  <div className={`px-4 py-2 rounded-xl text-lg font-bold border ${t.chipMore}`}>
                    +{waitingQueues.length - 50} lagi
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {runningText && (
          <div className="relative z-10 bg-[#EA580C] py-3 overflow-hidden shadow-lg">
            <div className="marquee whitespace-nowrap">
              <span className="text-white text-lg font-black inline-block px-8">{runningText}</span>
            </div>
          </div>
        )}

        <footer className={`relative z-10 ${t.footer} backdrop-blur-sm py-3 px-8 flex justify-between border-t`}>
          <div className="text-center">
            <p className={`text-[11px] uppercase tracking-widest font-bold ${t.footerLabel}`}>Total Hari Ini</p>
            <p className={`text-xl font-black tabular-nums ${t.footerValue}`}>{stats.total || 0}</p>
          </div>
          <div className="text-center">
            <p className={`text-[11px] uppercase tracking-widest font-bold ${t.footerLabel}`}>Dilayani</p>
            <p className={`text-xl font-black tabular-nums ${t.footerValue}`}>{stats.done || 0}</p>
          </div>
          <div className="text-center">
            <p className={`text-[11px] uppercase tracking-widest font-bold ${t.footerLabel}`}>Rata-rata Tunggu</p>
            <p className={`text-xl font-black tabular-nums ${t.footerValue}`}>{stats.avg_wait_minutes || 0} mnt</p>
          </div>
        </footer>
      </div>
    </PinGate>
  );
}