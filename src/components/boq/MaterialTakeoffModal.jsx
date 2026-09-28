import React, { useState, useMemo } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  calculateMaterialTakeoff 
} from '../../utils/materialTakeoff';
import { 
  Package, 
  X, 
  Search, 
  Printer, 
  Truck, 
  Layers, 
  FileText, 
  ShoppingBag, 
  Building, 
  MapPin, 
  Calendar, 
  User, 
  CircleDollarSign, 
  HardHat, 
  FileSpreadsheet, 
  Info,
  CheckCircle2,
  Boxes,
  Hammer
} from 'lucide-react';
import { formatRp, formatNumber } from '../../utils/formatters';

export function MaterialTakeoffModal({ isOpen, onClose }) {
  const { 
    state, 
    subtotal, 
    grandTotal, 
    materialTakeoffModalOpen, 
    setMaterialTakeoffModalOpen 
  } = useBoQ();

  const isModalVisible = isOpen !== undefined ? isOpen : materialTakeoffModalOpen;
  const handleClose = onClose || (() => setMaterialTakeoffModalOpen(false));

  const [documentMode, setDocumentMode] = useState('bom'); // 'bom' (Rekapitulasi Lengkap) | 'po' (Purchase Order)
  const [truckCapacity, setTruckCapacity] = useState(6.5); // 6.5m3 dump truck or 1.5m3 pick-up
  const [selectedTab, setSelectedTab] = useState('all'); // 'all' | 'semen_agregat' | 'besi_baja' | 'dinding_lantai' | 'finishing_mep' | 'tenaga_kerja'
  const [searchQuery, setSearchQuery] = useState('');

  // Hitung take-off material & upah secara reaktif (baku tunggal kemasan sak 40kg)
  const takeoffData = useMemo(() => {
    return calculateMaterialTakeoff(state, {
      cementPackWeight: 40,
      truckCapacityM3: truckCapacity
    });
  }, [state, truckCapacity]);

  if (!isModalVisible) return null;

  const { materials, labor, summary } = takeoffData;

  // Filter berdasarkan tab dan search query
  const filteredMaterials = materials.filter(item => {
    if (selectedTab !== 'all' && selectedTab !== 'tenaga_kerja' && item.group !== selectedTab) {
      return false;
    }
    if (selectedTab === 'tenaga_kerja') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.note && item.note.toLowerCase().includes(q)) ||
        item.unit.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredLabor = labor.filter(item => {
    if (selectedTab !== 'all' && selectedTab !== 'tenaga_kerja') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q);
    }
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const projectDate = state.project.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const yearNow = new Date().getFullYear();

  return (
    <div className="takeoff-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="takeoff-modal-card relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-300 my-auto flex flex-col max-h-[96vh] overflow-hidden text-slate-900"
        role="dialog"
      >
        {/* ==================== MODAL TOOLBAR (NO-PRINT) ==================== */}
        <div className="no-print p-3 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-heading font-bold text-white">
                  Penerbitan Dokumen Logistik & Material
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Standar Cetak A4
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Pilih format Rekapitulasi Kebutuhan BOM atau Surat Pesanan Pembelian Bahan (SPO / Purchase Order).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setDocumentMode('bom')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
                  documentMode === 'bom' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>1. Rekapitulasi Bahan (BOM)</span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentMode('po')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
                  documentMode === 'po' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>2. Surat Pesanan Bahan (SPO Supplier)</span>
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-900/40 transition-all transform hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Tutup Pratinjau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ==================== INTERACTIVE FILTER CONTROLS (NO-PRINT) ==================== */}
        <div className="no-print p-3 sm:px-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none font-medium">
            <button
              type="button"
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                selectedTab === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Semua ({materials.length + labor.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab('semen_agregat')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                selectedTab === 'semen_agregat'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Semen & Agregat
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab('besi_baja')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                selectedTab === 'besi_baja'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Besi Tulangan & Baja
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab('dinding_lantai')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                selectedTab === 'dinding_lantai'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Dinding & Penutup
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab('finishing_mep')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                selectedTab === 'finishing_mep'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              MEP & Finishing
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab('tenaga_kerja')}
              className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                selectedTab === 'tenaga_kerja'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
              }`}
            >
              Upah Tenaga (HOK)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-52">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter bahan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none"
              />
            </div>

            <div className="py-1 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-100 font-mono text-slate-700 flex items-center gap-1 font-semibold select-none">
              <span>Standar: Sak 40 kg</span>
            </div>
          </div>
        </div>

        {/* ==================== PRINTABLE PAPER SHEET (PRINT BODY) ==================== */}
        <div className="takeoff-modal-body flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/80">
          <div className="takeoff-paper-sheet bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-300 mx-auto max-w-4xl font-sans text-slate-900">
            
            {/* Kop Surat Dokumen Resmi */}
            <div className="border-b-2 border-slate-900 pb-3 mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src="/LOGO-Model_1.jpg" 
                  alt="SR Studio Logo" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/icon.png';
                  }}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded shrink-0"
                />
                <div>
                  <h1 className="font-heading font-black text-base sm:text-lg tracking-tight text-slate-950 uppercase leading-none">
                    SR STUDIO
                  </h1>
                  <p className="text-[10px] sm:text-[11px] font-bold tracking-wide text-slate-800 uppercase mt-0.5">
                    ARCHITECTURE DESIGN &bull; CIVIL CONTRACTOR &bull; COST ESTIMATOR
                  </p>
                  <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                    Perencanaan Arsitektur, Pengawasan Konstruksi & Pengadaan Logistik Proyek
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900 text-white tracking-wider mb-1">
                  {documentMode === 'bom' ? 'DOKUMEN LOGISTIK BOM' : 'SURAT PESANAN BAHAN (SPO)'}
                </span>
                <p className="text-xs font-mono font-bold text-slate-900">
                  No: {documentMode === 'bom' ? `BOM/SR/${yearNow}/001` : `SPO/SR/${yearNow}/001`}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Tanggal: {projectDate}
                </p>
              </div>
            </div>

            {/* Judul Utama Dokumen */}
            <div className="text-center my-4">
              <h1 className="text-lg sm:text-xl font-heading font-extrabold uppercase tracking-wide text-slate-950">
                {documentMode === 'bom' 
                  ? 'REKAPITULASI KEBUTUHAN LOGISTIK & MATERIAL BANGUNAN' 
                  : 'SURAT PESANAN BAHAN MATERIAL (SPO / PURCHASE ORDER)'}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {documentMode === 'bom'
                  ? 'Kalkulasi Dekomposisi Kebutuhan Material Riil & Alokasi Hari Orang Kerja (HOK)'
                  : 'Formulir Pemesanan Resmi Pengadaan Material Proyek ke Toko / Supplier Bangunan (SPO)'}
              </p>
            </div>

            {/* Informasi Proyek & Pengiriman */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-5 font-mono">
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">Nama Proyek:</span>
                <span className="font-bold text-slate-900 truncate block">
                  {state.project.name || 'Proyek Tanpa Nama'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">Pemilik / Klien:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {state.project.client || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">Lokasi / Pengantaran:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {state.project.location || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">
                  {documentMode === 'bom' ? 'Total RAB Konstruksi:' : 'Syarat Pembayaran:'}
                </span>
                <span className="font-bold text-emerald-800 truncate block">
                  {documentMode === 'bom' ? formatRp(grandTotal) : 'Tempo 14 Hari / Transfer'}
                </span>
              </div>
            </div>

            {/* Ringkasan Parameter Logistik (Khusus Mode BOM) */}
            {documentMode === 'bom' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-100/70 border border-slate-300 text-xs mb-5 font-mono print-break-inside-avoid">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Total Sak Semen:</span>
                  <span className="font-bold text-slate-900 block">
                    {summary.semenSack40kg} Sak (@40kg)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Total Pasir & Agregat:</span>
                  <span className="font-bold text-slate-900 block">
                    {formatNumber(summary.totalPasirM3, 1)} m³ (≈ {summary.truckPasirRits} Rit Truk)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Besi Tulangan Rebar:</span>
                  <span className="font-bold text-slate-900 block">
                    {formatNumber(summary.totalRebarKg, 0)} kg (≈ {summary.totalRebarLonjor} Lonjor)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Estimasi Belanja Bahan:</span>
                  <span className="font-bold text-emerald-800 block">
                    {formatRp(summary.totalMaterialCost)}
                  </span>
                </div>
              </div>
            )}

            {/* ==================== TABEL BAHAN MATERIAL ==================== */}
            <div className="mb-6 print-break-inside-avoid">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-slate-700" />
                  {documentMode === 'bom' 
                    ? `Daftar Material & Bahan Bangunan (${filteredMaterials.length} Item)` 
                    : `Daftar Barang yang Dipesan (${filteredMaterials.length} Item)`}
                </h3>
                <span className="text-xs font-mono font-bold text-slate-800">
                  Subtotal: {formatRp(filteredMaterials.reduce((s, it) => s + it.estimatedCost, 0))}
                </span>
              </div>

              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-y-2 border-slate-900 bg-slate-100 text-[10px] uppercase font-bold text-slate-900">
                    <th className="py-2 px-2 text-center w-8 border-r border-slate-300">No</th>
                    <th className="py-2 px-3 border-r border-slate-300">Nama Bahan / Spesifikasi Toko</th>
                    <th className="py-2 px-3 text-right w-24 border-r border-slate-300">Volume</th>
                    <th className="py-2 px-2 text-center w-16 border-r border-slate-300">Satuan</th>
                    <th className="py-2 px-3 text-right w-28 border-r border-slate-300">Harga Satuan</th>
                    <th className="py-2 px-3 text-right w-32 border-r border-slate-300">Total Harga</th>
                    <th className="py-2 px-3">{documentMode === 'bom' ? 'Pos Pekerjaan' : 'Catatan Pengiriman'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {filteredMaterials.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="py-1.5 px-2 text-center text-slate-600 font-bold border-r border-slate-200">{idx + 1}</td>
                      <td className="py-1.5 px-3 font-sans font-semibold text-slate-900 border-r border-slate-200">
                        {item.name}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-950 border-r border-slate-200">
                        {formatNumber(
                          item.quantity, 
                          ['buah', 'sak', 'pcs', 'dus', 'batang', 'lonjor', 'pail', 'galon', 'roll', 'bungkus', 'lembar', 'box', 'set', 'unit', 'rit', 'keping', 'tube'].includes(item.unit?.toLowerCase()) ? (item.quantity % 1 === 0 ? 0 : 1) : 2
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-700 border-r border-slate-200">
                        {item.unit}
                      </td>
                      <td className="py-1.5 px-3 text-right text-slate-800 border-r border-slate-200">
                        {item.quantity > 0 && item.estimatedCost > 0 ? formatRp(Math.round(item.estimatedCost / item.quantity)) : '-'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900 border-r border-slate-200">
                        {item.estimatedCost > 0 ? formatRp(item.estimatedCost) : '-'}
                      </td>
                      <td className="py-1.5 px-3 text-[10px] text-slate-600 font-sans">
                        {item.note && item.sources?.length 
                          ? `${item.note} (Pos: ${item.sources.slice(0, 1).join(', ')})`
                          : (item.note || item.sources?.slice(0, 1).join(', ') || '-')}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold">
                    <td colSpan={5} className="py-2 px-3 text-right uppercase text-xs">
                      Total Belanja Bahan Material:
                    </td>
                    <td className="py-2 px-3 text-right text-xs font-black text-emerald-900">
                      {formatRp(filteredMaterials.reduce((s, it) => s + it.estimatedCost, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ==================== TABEL UPAH HOK (HANYA MODE BOM) ==================== */}
            {documentMode === 'bom' && (selectedTab === 'all' || selectedTab === 'tenaga_kerja') && filteredLabor.length > 0 && (
              <div className="mb-6 print-break-inside-avoid">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-amber-900">
                  <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <Hammer className="w-3.5 h-3.5 text-amber-700" />
                    Alokasi Hari Orang Kerja (HOK) Tenaga Kerja SNI
                  </h3>
                  <span className="text-xs font-mono font-bold text-amber-950">
                    Subtotal Upah: {formatRp(filteredLabor.reduce((s, it) => s + it.estimatedCost, 0))}
                  </span>
                </div>

                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-y-2 border-amber-900 bg-amber-100/60 text-[10px] uppercase font-bold text-amber-950">
                      <th className="py-2 px-2 text-center w-8 border-r border-amber-300">No</th>
                      <th className="py-2 px-3 border-r border-amber-300">Klasifikasi Tenaga Kerja</th>
                      <th className="py-2 px-3 text-right w-28 border-r border-amber-300">Alokasi HOK</th>
                      <th className="py-2 px-2 text-center w-20 border-r border-amber-300">Satuan</th>
                      <th className="py-2 px-3 text-right w-36 border-r border-amber-300">Upah Satuan Dasar</th>
                      <th className="py-2 px-3 text-right w-36">Total Biaya Upah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200">
                    {filteredLabor.map((item, idx) => (
                      <tr key={idx} className="border-b border-amber-100">
                        <td className="py-1.5 px-2 text-center text-amber-700 font-bold border-r border-amber-200">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-sans font-semibold text-slate-900 border-r border-amber-200">
                          {item.name}
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-amber-950 border-r border-amber-200">
                          {formatNumber(item.quantity, 1)}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-700 border-r border-amber-200">
                          {item.unit}
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-800 border-r border-amber-200">
                          {item.quantity > 0 && item.estimatedCost > 0 ? formatRp(item.estimatedCost / item.quantity) : '-'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-amber-950">
                          {item.estimatedCost > 0 ? formatRp(item.estimatedCost) : '-'}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-amber-900 bg-amber-50 font-bold">
                      <td colSpan={5} className="py-2 px-3 text-right uppercase text-xs">
                        Total Alokasi Upah Tenaga Kerja:
                      </td>
                      <td className="py-2 px-3 text-right text-xs font-black text-amber-950">
                        {formatRp(filteredLabor.reduce((s, it) => s + it.estimatedCost, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Syarat & Ketentuan Pemesanan (Khusus Mode Purchase Order) */}
            {documentMode === 'po' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 text-[11px] text-slate-700 mb-6 space-y-1 print-break-inside-avoid">
                <span className="font-bold text-slate-900 block uppercase tracking-wide">
                  Syarat & Ketentuan Pemesanan Bahan:
                </span>
                <p>1. Seluruh barang yang dikirim harus sesuai dengan spesifikasi SNI dan jumlah yang tertera pada lembar pesanan ini.</p>
                <p>2. Surat jalan pengiriman wajib dilampirkan dan ditandatangani oleh bagian logistik/pengawas lapangan saat barang tiba di lokasi.</p>
                <p>3. Pihak pembeli berhak menolak atau mengembalikan material yang rusak, cacat, basah, atau tidak sesuai ukuran.</p>
              </div>
            )}

            {/* ==================== KOLOM TANDA TANGAN (SIGNATURE BLOCK) ==================== */}
            <div className="mt-8 pt-4 border-t-2 border-slate-900 print-break-inside-avoid">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
                
                <div className="space-y-16">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Dibuat / Dipesan Oleh:</span>
                  <div>
                    <span className="font-bold text-slate-900 block underline underline-offset-4">
                      ( Bagian Logistik & Pengadaan )
                    </span>
                    <span className="text-[10px] text-slate-500 block">SR Studio</span>
                  </div>
                </div>

                <div className="space-y-16">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Diperiksa Lapangan:</span>
                  <div>
                    <span className="font-bold text-slate-900 block underline underline-offset-4">
                      ( Pelaksana Lapangan / Mandor )
                    </span>
                    <span className="text-[10px] text-slate-500 block">Koordinator Proyek</span>
                  </div>
                </div>

                <div className="space-y-16">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Disetujui:</span>
                  <div>
                    <span className="font-bold text-slate-900 block underline underline-offset-4">
                      ( Project Manager / Owner )
                    </span>
                    <span className="text-[10px] text-slate-500 block">Pemberi Tugas</span>
                  </div>
                </div>

                <div className="space-y-16">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">
                    {documentMode === 'bom' ? 'Verifikasi Dokumen:' : 'Diterima Toko / Supplier:'}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block underline underline-offset-4">
                      {documentMode === 'bom' ? '( Arsip Kantor Pusat )' : '( Toko Bangunan / Supplier )'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Tanggal: ____ / ____ / {yearNow}</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ==================== MODAL FOOTER (NO-PRINT) ==================== */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Format cetak telah dioptimalkan untuk ukuran kertas A4 Portrait tanpa latar belakang gelap.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30 transition-all transform hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
