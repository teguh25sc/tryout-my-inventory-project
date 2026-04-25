import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Minus, Package, History, Trash2,
  AlertTriangle, CheckCircle, XCircle, Loader2,
  BarChart3, RefreshCw, X, ShoppingBag
} from 'lucide-react';

// ============================================================
// ⚙️  CONFIGURATION — set REACT_APP_API_URL in your .env file
//     or in the Amplify Console → Environment variables.
//     The value should be your API Gateway Invoke URL + /barang
//     e.g. https://abc123.execute-api.us-east-1.amazonaws.com/prod/barang
// ============================================================
const API_URL = process.env.REACT_APP_API_URL || "https://URL_API_GATEWAY_KAMU/barang";
// ============================================================

// ─── helpers ────────────────────────────────────────────────
const stockStatus = (stok) => {
  if (stok <= 0)  return { label: 'Habis',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: <XCircle size={14}/> };
  if (stok <= 5)  return { label: 'Kritis',  color: '#f97316', bg: 'rgba(249,115,22,0.15)',  icon: <AlertTriangle size={14}/> };
  if (stok <= 20) return { label: 'Rendah',  color: '#eab308', bg: 'rgba(234,179,8,0.15)',   icon: <AlertTriangle size={14}/> };
  return           { label: 'Normal',  color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   icon: <CheckCircle size={14}/> };
};

// ─── Toast / Alert ──────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { border: '#22c55e', icon: <CheckCircle size={18} color="#22c55e"/> },
    error:   { border: '#ef4444', icon: <XCircle    size={18} color="#ef4444"/> },
    info:    { border: '#6366f1', icon: <AlertTriangle size={18} color="#6366f1"/> },
  }[type] || { border: '#6366f1', icon: null };

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: 'rgba(15,15,30,0.95)',
      border: `1px solid ${colors.border}`,
      borderLeft: `4px solid ${colors.border}`,
      borderRadius: 12, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      animation: 'slideIn .3s ease', maxWidth: 340
    }}>
      {colors.icon}
      <span style={{ color: '#e2e8f0', fontSize: 14, flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
        <X size={16}/>
      </button>
    </div>
  );
};

// ─── Modal: Add Item ─────────────────────────────────────────
const AddItemModal = ({ onClose, onSave }) => {
  const [nama, setNama]   = useState('');
  const [stok, setStok]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nama.trim()) return;
    setSaving(true);
    await onSave(nama.trim(), parseInt(stok) || 0);
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(145deg, #1e1b3a, #16213e)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 420,
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#e2e8f0', margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
            <ShoppingBag size={20} color="#818cf8"/> Tambah Barang Baru
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={18}/>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Nama Barang *
            </label>
            <input
              autoFocus
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="e.g. Laptop Dell XPS"
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)',
                color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Stok Awal
            </label>
            <input
              type="number" min="0" value={stok}
              onChange={e => setStok(e.target.value)}
              placeholder="0"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)',
                color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          <button type="submit" disabled={saving || !nama.trim()} style={{
            marginTop: 8, padding: '13px 0', borderRadius: 10,
            background: saving || !nama.trim() ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity .2s'
          }}>
            {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }}/> Menyimpan…</> : 'Simpan Barang'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Modal: Update Stock ──────────────────────────────────────
const StockModal = ({ item, aksi, onClose, onConfirm }) => {
  const [jumlah, setJumlah] = useState(1);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (jumlah < 1) return;
    setSaving(true);
    await onConfirm(item.id, aksi, jumlah);
    setSaving(false);
    onClose();
  };

  const isKurang = aksi === 'kurang';
  const accent = isKurang ? '#ef4444' : '#22c55e';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(145deg, #1e1b3a, #16213e)',
        border: `1px solid ${isKurang ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
        borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 380,
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
      }}>
        <h2 style={{ color: '#e2e8f0', margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>
          {isKurang ? 'Kurangi' : 'Tambah'} Stok
        </h2>
        <p style={{ color: '#94a3b8', margin: '0 0 24px', fontSize: 14 }}>
          {item.nama} — Stok saat ini: <strong style={{ color: accent }}>{item.stok}</strong>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setJumlah(j => Math.max(1, j - 1))} style={{
            width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: 18, cursor: 'pointer', flexShrink: 0
          }}>−</button>
          <input type="number" min="1" value={jumlah} onChange={e => setJumlah(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              flex: 1, textAlign: 'center', padding: '10px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)',
              color: '#e2e8f0', fontSize: 20, fontWeight: 700, outline: 'none'
            }}/>
          <button onClick={() => setJumlah(j => j + 1)} style={{
            width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: 18, cursor: 'pointer', flexShrink: 0
          }}>+</button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', borderRadius: 10,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 14
          }}>Batal</button>
          <button onClick={handleConfirm} disabled={saving} style={{
            flex: 2, padding: '12px 0', borderRadius: 10,
            background: isKurang ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#22c55e,#16a34a)',
            border: 'none', color: '#fff', cursor: saving ? 'wait' : 'pointer',
            fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }}/> : (isKurang ? <Minus size={16}/> : <Plus size={16}/>)}
            {saving ? 'Memproses…' : `${isKurang ? 'Kurangi' : 'Tambah'} ${jumlah}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main App ────────────────────────────────────────────────
const App = () => {
  const [items, setItems]             = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [toast, setToast]             = useState(null);
  const [showAdd, setShowAdd]         = useState(false);
  const [stockModal, setStockModal]   = useState(null); // { item, aksi }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (msg, type = 'info') => setToast({ msg, type });

  // ── Fetch all items ──
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data. Cek koneksi atau URL API.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch history for selected item ──
  const fetchHistory = async (id) => {
    try {
      setHistLoading(true);
      const res  = await fetch(`${API_URL}/${id}/history`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : []);
    } catch { setHistory([]); }
    finally { setHistLoading(false); }
  };

  // ── Handle stock update ──
  const handleStock = async (id, aksi, jumlah) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aksi, jumlah })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal update stok');
      showToast(`Stok berhasil di${aksi === 'tambah' ? 'tambah' : 'kurangi'}! Stok baru: ${data.stok_baru}`, 'success');
      await fetchItems();
      if (selectedItem?.id === id) fetchHistory(id);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // ── Add new item ──
  const handleAddItem = async (nama, stok) => {
    try {
      const res  = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, stok })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambah barang');
      showToast(`Barang "${nama}" berhasil ditambahkan!`, 'success');
      setShowAdd(false);
      await fetchItems();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // ── Delete item ──
  const handleDelete = async (id, nama) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus barang');
      showToast(`"${nama}" berhasil dihapus.`, 'success');
      if (selectedItem?.id === id) { setSelectedItem(null); setHistory([]); }
      await fetchItems();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Stats ──
  const totalItems = items.length;
  const outOfStock = items.filter(i => i.stok <= 0).length;
  const lowStock   = items.filter(i => i.stok > 0 && i.stok <= 5).length;
  const totalStock = items.reduce((sum, i) => sum + i.stok, 0);

  const s = {
    root:       { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f2e 50%, #0a0a1a 100%)', padding: '24px 16px', fontFamily: "'Inter', sans-serif", color: '#e2e8f0' },
    container:  { maxWidth: 1200, margin: '0 auto' },
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 16 },
    title:      { fontSize: 26, fontWeight: 800, background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 },
    subtitle:   { color: '#64748b', fontSize: 14, margin: '4px 0 0' },
    statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 16, marginBottom: 32 },
    statCard:   (accent) => ({
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '18px 20px', backdropFilter: 'blur(10px)',
      borderTop: `3px solid ${accent}`
    }),
    mainGrid:   { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 },
    card:       { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden', backdropFilter: 'blur(10px)' },
    cardHeader: { padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    addBtn:     { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    iconBtn:    (color, bg) => ({ padding: '7px', borderRadius: 8, background: bg, border: 'none', color, cursor: 'pointer', display: 'flex', alignItems: 'center' }),
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        * { box-sizing: border-box }
        input[type=number]::-webkit-inner-spin-button { opacity:.5 }
        ::-webkit-scrollbar { width: 4px } ::-webkit-scrollbar-thumb { background: rgba(99,102,241,.4); border-radius: 2px }
      `}</style>

      <div style={s.container}>
        {/* ── Header ── */}
        <header style={s.header}>
          <div>
            <h1 style={s.title}>📦 Smart Inventory</h1>
            <p style={s.subtitle}>AWS RDS · DynamoDB · SNS Low-Stock Alerts</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => fetchItems()} title="Refresh" style={{
              padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center'
            }}>
              <RefreshCw size={16} style={loading ? { animation: 'spin 1s linear infinite' } : {}}/>
            </button>
            <button style={s.addBtn} onClick={() => setShowAdd(true)}>
              <Plus size={16}/> Tambah Barang
            </button>
          </div>
        </header>

        {/* ── Stats ── */}
        <div style={s.statsGrid}>
          {[
            { label: 'Total Produk', value: totalItems, accent: '#6366f1', icon: <BarChart3 size={18} color="#6366f1"/> },
            { label: 'Total Stok',   value: totalStock,  accent: '#22c55e', icon: <Package    size={18} color="#22c55e"/> },
            { label: 'Stok Kritis',  value: lowStock,    accent: '#f97316', icon: <AlertTriangle size={18} color="#f97316"/> },
            { label: 'Stok Habis',   value: outOfStock,  accent: '#ef4444', icon: <XCircle   size={18} color="#ef4444"/> },
          ].map(({ label, value, accent, icon }) => (
            <div key={label} style={s.statCard(accent)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
                {icon}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Out-of-stock global alert ── */}
        {outOfStock > 0 && (
          <div style={{
            marginBottom: 20, padding: '14px 20px', borderRadius: 12,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, animation: 'pulse 2s infinite' }}/>
            <p style={{ margin: 0, color: '#fca5a5', fontSize: 14 }}>
              <strong>{outOfStock} barang</strong> memiliki stok kosong!
              Sistem akan otomatis mengirim notifikasi ke admin melalui SNS setiap jam via EventBridge.
            </p>
          </div>
        )}

        {/* ── Main grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 20 }}>

          {/* Item table */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Package size={18} color="#818cf8"/> Daftar Barang
              </h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>{totalItems} item</span>
            </div>

            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#475569' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }}/>
                <p style={{ margin: 0, fontSize: 14 }}>Memuat data…</p>
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#475569' }}>
                <Package size={32} style={{ marginBottom: 8, opacity: .4 }}/>
                <p style={{ margin: 0, fontSize: 14 }}>Belum ada barang. Klik "Tambah Barang" untuk mulai.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['Produk', 'Stok', 'Status', 'Aksi'].map((h, i) => (
                        <th key={h} style={{
                          padding: '12px 16px', color: '#475569', fontSize: 11, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '.06em',
                          textAlign: i === 0 ? 'left' : 'center'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const st = stockStatus(item.stok);
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <tr key={item.id}
                          onClick={() => { setSelectedItem(item); fetchHistory(item.id); }}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                            cursor: 'pointer', transition: 'background .15s'
                          }}
                          onMouseEnter={e => !isSelected && (e.currentTarget.style.background='rgba(255,255,255,0.03)')}
                          onMouseLeave={e => !isSelected && (e.currentTarget.style.background='transparent')}
                        >
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: `${st.bg}`, border: `1px solid ${st.color}33`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: st.color, flexShrink: 0
                              }}>
                                <Package size={16}/>
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.nama}</div>
                                <div style={{ fontSize: 11, color: '#475569' }}>ID #{item.id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 800, fontSize: 18,
                              color: item.stok <= 0 ? '#ef4444' : item.stok <= 5 ? '#f97316' : '#e2e8f0'
                            }}>{item.stok}</span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '4px 10px', borderRadius: 20,
                              background: st.bg, color: st.color,
                              fontSize: 11, fontWeight: 700, border: `1px solid ${st.color}40`
                            }}>
                              {st.icon} {st.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                              <button title="Tambah stok"
                                onClick={() => setStockModal({ item, aksi: 'tambah' })}
                                style={s.iconBtn('#22c55e','rgba(34,197,94,0.12)')}>
                                <Plus size={15}/>
                              </button>
                              <button title="Kurangi stok"
                                onClick={() => setStockModal({ item, aksi: 'kurang' })}
                                disabled={item.stok <= 0}
                                style={s.iconBtn('#ef4444', item.stok <= 0 ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.12)')}>
                                <Minus size={15}/>
                              </button>
                              <button title="Hapus barang"
                                onClick={() => setDeleteConfirm(item)}
                                style={s.iconBtn('#94a3b8','rgba(148,163,184,0.1)')}>
                                <Trash2 size={15}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* History panel */}
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', maxHeight: 520, overflowY: 'auto' }}>
            <div style={{ ...s.cardHeader, position: 'sticky', top: 0, background: 'rgba(15,15,30,0.9)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                <History size={18} color="#818cf8"/> Activity Log
              </h2>
              {selectedItem && <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, background: 'rgba(99,102,241,0.12)', padding: '3px 9px', borderRadius: 20 }}>{selectedItem.nama}</span>}
            </div>
            <div style={{ padding: 16, flex: 1 }}>
              {!selectedItem ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#475569' }}>
                  <History size={28} style={{ marginBottom: 8, opacity: .4 }}/>
                  <p style={{ margin: 0, fontSize: 13 }}>Klik baris barang untuk melihat riwayat pergerakan stok</p>
                </div>
              ) : histLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                  <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }}/>
                </div>
              ) : history.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: '40px 0' }}>Belum ada riwayat.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {history.map(log => {
                    const isIn   = log.aksi === 'STOCK_IN' || log.aksi === 'INITIAL_STOCK';
                    const isDel  = log.aksi === 'DELETE';
                    const color  = isDel ? '#ef4444' : isIn ? '#22c55e' : '#f97316';
                    return (
                      <div key={log.log_id} style={{
                        display: 'flex', gap: 10, padding: '10px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                      }}>
                        <div style={{ width: 3, borderRadius: 4, background: color, flexShrink: 0, minHeight: 36 }}/>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color }}>
                            {log.aksi}
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0' }}>{log.keterangan}</div>
                          <div style={{ fontSize: 10, color: '#475569' }}>
                            {new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onSave={handleAddItem}/>}
      {stockModal && (
        <StockModal
          item={stockModal.item}
          aksi={stockModal.aksi}
          onClose={() => setStockModal(null)}
          onConfirm={handleStock}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500
        }} onClick={() => setDeleteConfirm(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(145deg,#1e1b3a,#16213e)',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20,
            padding: '28px', maxWidth: 360, width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
          }}>
            <Trash2 size={28} color="#ef4444" style={{ marginBottom: 12 }}/>
            <h3 style={{ color: '#e2e8f0', margin: '0 0 8px', fontSize: 17 }}>Hapus Barang?</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 24px' }}>
              <strong style={{ color: '#e2e8f0' }}>"{deleteConfirm.nama}"</strong> akan dihapus permanen dari sistem.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 14
              }}>Batal</button>
              <button onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.nama)} style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14
              }}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  );
};

export default App;
