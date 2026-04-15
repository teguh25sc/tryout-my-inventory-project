import React, { useState, useEffect } from 'react';
import { Plus, Minus, Package, History, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const App = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- API CALLS ---
  const API_URL = "https://api-id.execute-api.region.amazonaws.com/prod/barang";

  const fetchItems = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();
    setItems(data);
  };

  const updateStock = async (id, aksi, jumlah) => {
    setLoading(true);
    await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ aksi, jumlah }),
      headers: { 'Content-Type': 'application/json' }
    });
    fetchItems();
    setLoading(false);
  };

  const fetchHistory = async (id) => {
    const res = await fetch(`${API_URL}/${id}/history`);
    const data = await res.json();
    setHistory(data);
  };

  useEffect(() => { fetchItems(); }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Smart Inventory</h1>
            <p className="text-slate-500">Manage your assets with AWS Serverless.</p>
          </div>
          <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">
            <Plus size={20} /> Tambah Barang
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Table Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Produk</th>
                    <th className="px-6 py-4">Stok</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => { setSelectedItem(item); fetchHistory(item.id); }}
                    >
                      <td className="px-6 py-4 font-medium flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                          <Package size={20} />
                        </div>
                        {item.nama}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${item.stok < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {item.stok} Qty
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => updateStock(item.id, 'tambah', 1)}
                            className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                          >
                            <Plus size={18} />
                          </button>
                          <button 
                            onClick={() => updateStock(item.id, 'kurang', 1)}
                            className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          >
                            <Minus size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side Panel: History (DynamoDB Data) */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 h-fit sticky top-8">
            <div className="flex items-center gap-2 mb-6 font-bold text-lg">
              <History className="text-indigo-600" />
              <h2>Activity Logs</h2>
            </div>
            
            {selectedItem ? (
              <div className="space-y-6">
                <h3 className="font-semibold text-indigo-600">{selectedItem.nama}</h3>
                <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                  {history.length > 0 ? history.map((log) => (
                    <div key={log.log_id} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                        log.aksi.includes('IN') ? 'bg-green-500' : 'bg-rose-500'
                      }`} />
                      <p className="text-sm font-medium text-slate-800">{log.keterangan}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  )) : (
                    <p className="text-slate-400 text-sm ml-6 italic">Belum ada riwayat stok.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 text-sm">
                Klik salah satu barang untuk melihat riwayat stok
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
