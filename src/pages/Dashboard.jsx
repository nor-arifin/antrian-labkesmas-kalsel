import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';

export default function Dashboard() {
  const [tab, setTab] = useState('monitor');
  const [queues, setQueues] = useState([]);
  const [stats, setStats] = useState({});
  const [services, setServices] = useState([]);
  const [counters, setCounters] = useState([]);
  const [report, setReport] = useState(null);
  const [reportType, setReportType] = useState('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [runningText, setRunningText] = useState('');
  const [editingService, setEditingService] = useState(null);
  const [editingCounter, setEditingCounter] = useState(null);
  const { on } = useSocket();

  useEffect(() => { loadData(); loadSettings(); }, []);

  useEffect(() => {
    const unsubs = [
      on('queue:updated', () => loadData()),
      on('queue:created', () => loadData()),
      on('stats:updated', ({ stats: s }) => setStats(s)),
      on('counter:updated', () => loadData()),
      on('system:reset', () => { setQueues([]); setStats({}); }),
    ];
    return () => unsubs.forEach(u => u());
  }, [on]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadData() {
    try {
      const [q, s, svc, c] = await Promise.all([api.getActive(), api.getStats(), api.getServices(), api.getCounters()]);
      setQueues(q.data); setStats(s.data); setServices(svc.data); setCounters(c.data);
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data', 'error');
    }
  }

  async function loadSettings() {
    try {
      const res = await api.getSettings();
      setRunningText(res.data.running_text || '');
    } catch (err) {
      console.error(err);
    }
  }

  async function saveRunningText() {
    try {
      await api.updateSetting('running_text', runningText);
      showToast('Running text berhasil disimpan');
    } catch (err) {
      showToast('Gagal menyimpan running text', 'error');
    }
  }

  async function loadReport() {
    try {
      let res;
      if (reportType === 'daily') res = await api.getReportDaily(reportDate);
      else if (reportType === 'weekly') res = await api.getReportWeekly(reportDate);
      else res = await api.getReportMonthly(reportDate.slice(5, 7), reportDate.slice(0, 4));
      setReport(res.data);
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat laporan', 'error');
    }
  }

  async function handleReset() {
    if (!confirm('Reset antrian sekarang?')) return;
    try {
      await api.reset();
      await loadData();
      showToast('Antrian berhasil di-reset');
    } catch (err) {
      showToast('Gagal reset antrian', 'error');
    }
  }

  async function handleServiceSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const form = e.target;
    const formData = new FormData(form);
    const name = formData.get('name');
    const prefix = formData.get('prefix');
    const color = formData.get('color');

    if (!name || !prefix) {
      showToast('Nama dan prefix wajib diisi', 'error');
      setSubmitting(false);
      return;
    }

    try {
      await api.createService({ name, prefix, color });
      form.reset();
      form.querySelector('[name="color"]').value = '#3B82F6';
      await loadData();
      showToast(`Layanan "${name}" berhasil ditambahkan`);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Gagal menambah layanan', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCounterSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const form = e.target;
    const formData = new FormData(form);
    const name = formData.get('name');
    const serviceId = formData.get('serviceId');

    if (!name || !serviceId) {
      showToast('Nama loket dan layanan wajib diisi', 'error');
      setSubmitting(false);
      return;
    }

    try {
      await api.createCounter({ name, serviceId: parseInt(serviceId) });
      form.reset();
      await loadData();
      showToast(`Loket "${name}" berhasil ditambahkan`);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Gagal menambah loket', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleServiceUpdate(e) {
    e.preventDefault();
    if (submitting || !editingService) return;
    setSubmitting(true);
    const form = e.target;
    const formData = new FormData(form);

    try {
      await api.updateService(editingService.id, {
        name: formData.get('name'),
        prefix: formData.get('prefix'),
        color: formData.get('color'),
        is_active: formData.get('is_active') === 'on' ? 1 : 0,
      });
      setEditingService(null);
      await loadData();
      showToast('Layanan berhasil diupdate');
    } catch (err) {
      showToast(err.message || 'Gagal mengupdate layanan', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleServiceDelete(id, name) {
    if (!confirm(`Hapus layanan "${name}"?`)) return;
    try {
      await api.deleteService(id);
      await loadData();
      showToast(`Layanan "${name}" berhasil dihapus`);
    } catch (err) {
      showToast(err.message || 'Gagal menghapus layanan', 'error');
    }
  }

  async function handleCounterUpdate(e) {
    e.preventDefault();
    if (submitting || !editingCounter) return;
    setSubmitting(true);
    const form = e.target;
    const formData = new FormData(form);

    try {
      await api.updateCounter(editingCounter.id, {
        name: formData.get('name'),
        serviceId: parseInt(formData.get('serviceId')),
        is_active: formData.get('is_active') === 'on' ? 1 : 0,
      });
      setEditingCounter(null);
      await loadData();
      showToast('Loket berhasil diupdate');
    } catch (err) {
      showToast(err.message || 'Gagal mengupdate loket', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCounterDelete(id, name) {
    if (!confirm(`Hapus loket "${name}"?`)) return;
    try {
      await api.deleteCounter(id);
      await loadData();
      showToast(`Loket "${name}" berhasil dihapus`);
    } catch (err) {
      showToast(err.message || 'Gagal menghapus loket', 'error');
    }
  }

  const tabs = [
    { id: 'monitor', label: 'Monitor', icon: '📊' },
    { id: 'services', label: 'Layanan', icon: '🏥' },
    { id: 'counters', label: 'Loket', icon: '🖥️' },
    { id: 'report', label: 'Laporan', icon: '📈' },
    { id: 'settings', label: 'Pengaturan', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl text-white font-semibold text-sm transition-all ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
        }`}>
          {toast.msg}
        </div>
      )}

      {editingService && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Edit Layanan</h3>
              <button onClick={() => setEditingService(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleServiceUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Layanan</label>
                  <input name="name" defaultValue={editingService.name} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex gap-4">
                  <div className="w-24">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Prefix</label>
                    <input name="prefix" defaultValue={editingService.prefix} required maxLength={1}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 uppercase text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Warna</label>
                    <input name="color" type="color" defaultValue={editingService.color}
                      className="w-14 h-[46px] rounded-xl cursor-pointer border-0" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                    <label className="flex items-center gap-2 h-[46px] px-4 border border-gray-200 rounded-xl cursor-pointer">
                      <input type="checkbox" name="is_active" defaultChecked={editingService.is_active} className="w-4 h-4 accent-[#11B9A0]" />
                      <span className="text-sm font-semibold">Aktif</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" onClick={() => setEditingService(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition">
                  Batal
                </button>
                <button type="submit" disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-lg disabled:opacity-50">
                  {submitting ? '...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingCounter && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Edit Loket</h3>
              <button onClick={() => setEditingCounter(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleCounterUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Loket</label>
                  <input name="name" defaultValue={editingCounter.name} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Layanan</label>
                  <select name="serviceId" defaultValue={editingCounter.service_id} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Pilih layanan</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <label className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl cursor-pointer">
                    <input type="checkbox" name="is_active" defaultChecked={editingCounter.is_active} className="w-4 h-4 accent-[#11B9A0]" />
                    <span className="text-sm font-semibold">Aktif</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" onClick={() => setEditingCounter(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition">
                  Batal
                </button>
                <button type="submit" disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-lg disabled:opacity-50">
                  {submitting ? '...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-4 px-6 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/logo/antian_logo.svg" alt="Logo" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-black">Dashboard Admin</h1>
            <p className="text-xs opacity-70">Labkesda Kalsel</p>
          </div>
        </div>
        <button onClick={handleReset} className="bg-red-500/90 hover:bg-red-500 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg">
          Reset Antrian
        </button>
      </header>

      <div className="flex gap-1 p-4 bg-white shadow-sm">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              tab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            <span className="mr-1.5">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'monitor' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Hari Ini', value: stats.total || 0, bg: 'from-blue-500 to-blue-600' },
                { label: 'Menunggu', value: stats.waiting || 0, bg: 'from-amber-500 to-orange-500' },
                { label: 'Dilayani', value: stats.serving || 0, bg: 'from-emerald-500 to-green-500' },
                { label: 'Selesai', value: stats.done || 0, bg: 'from-gray-500 to-gray-600' },
              ].map(s => (
                <div key={s.label} className={`bg-gradient-to-br ${s.bg} rounded-2xl p-5 text-white shadow-xl`}>
                  <p className="text-sm opacity-80">{s.label}</p>
                  <p className="text-4xl font-black mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="p-5 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold">Antrian Aktif</h3>
                <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{queues.length} antrian</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-600">Nomor</th>
                      <th className="text-left p-4 font-semibold text-gray-600">Layanan</th>
                      <th className="text-left p-4 font-semibold text-gray-600">Status</th>
                      <th className="text-left p-4 font-semibold text-gray-600">Prioritas</th>
                      <th className="text-left p-4 font-semibold text-gray-600">Loket</th>
                      <th className="text-left p-4 font-semibold text-gray-600">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queues.length === 0 ? (
                      <tr><td colSpan="6" className="p-12 text-center text-gray-300">Tidak ada antrian</td></tr>
                    ) : queues.map(q => (
                      <tr key={q.id} className="border-t hover:bg-gray-50 transition">
                        <td className="p-4 font-bold text-lg">{q.queue_number}</td>
                        <td className="p-4">
                          <span className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: q.service_color }}>
                            {q.service_name}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            q.status === 'calling' ? 'bg-yellow-100 text-yellow-700' :
                            q.status === 'serving' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {q.status === 'waiting' ? 'Menunggu' : q.status === 'calling' ? 'Dipanggil' : 'Dilayani'}
                          </span>
                        </td>
                        <td className="p-4">
                          {q.priority > 0 ? <span className="text-yellow-600 font-bold">{q.priority === 1 ? 'Lansia' : 'Hamil'}</span> : '-'}
                        </td>
                        <td className="p-4">{q.counter_name || '-'}</td>
                        <td className="p-4 text-gray-400">{new Date(q.created_at).toLocaleTimeString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'services' && (
          <div className="max-w-3xl">
            <form onSubmit={handleServiceSubmit} className="bg-white rounded-2xl p-6 shadow-xl mb-6 border border-gray-100">
              <h3 className="text-lg font-bold mb-4">Tambah Layanan</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Layanan</label>
                  <input name="name" placeholder="Contoh: Pemeriksaan Darah" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Prefix</label>
                  <input name="prefix" placeholder="E" required maxLength={1}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 uppercase text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Warna</label>
                  <input name="color" type="color" defaultValue="#3B82F6"
                    className="w-14 h-[46px] rounded-xl cursor-pointer border-0" />
                </div>
                <button type="submit" disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg disabled:opacity-50">
                  {submitting ? '...' : 'Tambah'}
                </button>
              </div>
            </form>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              {services.length === 0 ? (
                <p className="p-8 text-center text-gray-400">Belum ada layanan</p>
              ) : services.map(s => (
                <div key={s.id} className="flex items-center gap-4 p-4 border-b last:border-0 hover:bg-gray-50">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg" style={{ backgroundColor: s.color }}>
                    {s.prefix}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{s.name}</p>
                    <p className="text-xs text-gray-400">Prefix: {s.prefix}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingService(s)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                      ✏️
                    </button>
                    <button onClick={() => handleServiceDelete(s.id, s.name)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'counters' && (
          <div className="max-w-3xl">
            <form onSubmit={handleCounterSubmit} className="bg-white rounded-2xl p-6 shadow-xl mb-6 border border-gray-100">
              <h3 className="text-lg font-bold mb-4">Tambah Loket</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Loket</label>
                  <input name="name" placeholder="Contoh: Loket 5" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Layanan</label>
                  <select name="serviceId" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Pilih layanan</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg disabled:opacity-50">
                  {submitting ? '...' : 'Tambah'}
                </button>
              </div>
            </form>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              {counters.length === 0 ? (
                <p className="p-8 text-center text-gray-400">Belum ada loket</p>
              ) : counters.map(c => (
                <div key={c.id} className="flex items-center gap-4 p-4 border-b last:border-0 hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600">
                    {c.id}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.service_name}</p>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingCounter(c)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                      ✏️
                    </button>
                    <button onClick={() => handleCounterDelete(c.id, c.name)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'report' && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-2xl p-6 shadow-xl mb-6 border border-gray-100">
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-600">Jenis Laporan</label>
                  <select value={reportType} onChange={e => setReportType(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-600">Tanggal</label>
                  <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <button onClick={loadReport} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg">
                  Tampilkan
                </button>
              </div>
            </div>

            {report && (
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                <h3 className="text-lg font-bold mb-4">
                  Laporan {reportType === 'daily' ? 'Harian' : reportType === 'weekly' ? 'Mingguan' : 'Bulanan'}
                </h3>
                {report.summary && (
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Total', value: report.summary.total, bg: 'bg-blue-50', text: 'text-blue-600' },
                      { label: 'Selesai', value: report.summary.completed, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                      { label: 'Dibatalkan', value: report.summary.cancelled, bg: 'bg-amber-50', text: 'text-amber-600' },
                      { label: 'Rata-rata Tunggu', value: `${report.summary.avg_wait_minutes || 0} mnt`, bg: 'bg-purple-50', text: 'text-purple-600' },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                        <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                        <p className={`text-2xl font-black ${s.text}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {(report.byService || report.daily) && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {(report.byService?.[0] || report.daily?.[0]) && Object.keys(report.byService?.[0] || report.daily[0]).map(k => (
                            <th key={k} className="text-left p-3 font-semibold text-gray-600 capitalize">{k.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(report.byService || report.daily || []).map((row, i) => (
                          <tr key={i} className="border-t hover:bg-gray-50">
                            {Object.values(row).map((v, j) => <td key={j} className="p-3">{v ?? '-'}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-3xl">
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-bold mb-4">Running Text (Tampil di Layar Display)</h3>
              <p className="text-sm text-gray-500 mb-4">Teks ini akan berjalan (marquee) di bagian bawah layar antrian.</p>
              <textarea
                value={runningText}
                onChange={e => setRunningText(e.target.value)}
                placeholder="Contoh: Selamat datang di Labkesda Kalsel. Silakan ambil nomor antrian. Terima kasih."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#11B9A0] outline-none resize-none"
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={saveRunningText}
                  className="bg-[#11B9A0] hover:bg-[#0d9488] text-white px-6 py-3 rounded-xl font-bold transition shadow-lg"
                >
                  💾 Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
