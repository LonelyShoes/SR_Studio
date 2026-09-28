import React, { useState } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { Inbox, Check, X, CheckCheck, PlusCircle, Link2 } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

function normalizeUnit(unit) {
  if (!unit) return '';
  const u = String(unit).toLowerCase().trim();
  if (u === 'm2' || u === 'm²') return 'm²';
  if (u === 'm3' || u === 'm³') return 'm³';
  if (u === 'btg' || u === 'batang') return 'batang';
  if (u === 'lbr' || u === 'lembar') return 'lembar';
  if (u === 'bh' || u === 'buah' || u === 'pcs') return 'buah';
  if (u === 'zak' || u === 'sak') return 'sak';
  if (u === 'rol' || u === 'roll') return 'roll';
  if (u === 'm' || u === "m'" || u === 'meter') return "m'";
  if (u === 'pail') return 'pail';
  if (u === 'galon') return 'galon';
  if (u === 'rit') return 'rit';
  if (u === 'kg') return 'kg';
  if (u === 'liter' || u === 'ltr') return 'liter';
  if (u === 'dus' || u === 'box') return 'dus';
  if (u === 'unit' || u === 'set') return 'unit';
  return u;
}

function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function PendingQueuePanel() {
  const { 
    state, 
    applyPendingItem, 
    applyAllPendingItems,
    dismissPendingItem, 
    clearAllPendingItems 
  } = useBoQ();

  const pendingItems = state.pendingQueue || [];
  const categories = state.categories || [];

  // Local selection state for each pending item: key = queueId, value = "catId::itemKey" or "__new__"
  const [selectedTargets, setSelectedTargets] = useState({});

  if (pendingItems.length === 0) return null;

  const handleSelectChange = (queueId, val) => {
    setSelectedTargets(prev => ({ ...prev, [queueId]: val }));
  };

  const resolveTargetCategory = (catId) => {
    if (!categories || categories.length === 0) return null;
    let targetId = (catId || '').toLowerCase();
    if (targetId === 'arsitektur') targetId = 'dinding';
    if (targetId === 'sanitasi') targetId = 'mep';
    if (targetId === 'pondasi') targetId = 'tanah_pondasi';
    if (targetId === 'beton' || targetId === 'besi' || targetId === 'tulangan') targetId = 'struktur';
    if (targetId === 'kusen' || targetId === 'pintu' || targetId === 'jendela' || targetId === 'kusen_pintu_jendela') targetId = 'pintu_jendela';
    if (targetId === 'keramik') targetId = 'lantai';
    if (targetId === 'cat' || targetId === 'plester' || targetId === 'finishing' || targetId === 'finishing_cat') targetId = 'dinding';
    if (targetId === 'plafon' || targetId === 'gypsum') targetId = 'plafond';
    if (targetId === 'kuda_kuda' || targetId === 'genteng' || targetId === 'spandek') targetId = 'atap';

    return categories.find(c => c.id === targetId) || categories.find(c => c.id === 'struktur') || categories[0];
  };

  const getTargetFor = (item) => {
    if (selectedTargets[item.id]) return selectedTargets[item.id];
    
    // Strict Auto-Match: Only match if BOTH name AND unit are strictly identical
    const preferredCat = resolveTargetCategory(item.category);
    if (preferredCat && preferredCat.items) {
      const itemNorm = normalizeName(item.label || item.uraian);
      const unitNorm = normalizeUnit(item.satuan);

      // 1. Exact Name & Exact Unit Match
      const exactMatch = preferredCat.items.find(it => {
        const itNorm = normalizeName(it.uraian);
        const itUnit = normalizeUnit(it.satuan);
        return itNorm === itemNorm && itUnit === unitNorm;
      });
      if (exactMatch) return `${preferredCat.id}::${exactMatch.key}`;

      // 2. Strict Substring Match ONLY IF the unit matches 100% and names are unambiguous
      const strictMatch = preferredCat.items.find(it => {
        const itNorm = normalizeName(it.uraian);
        const itUnit = normalizeUnit(it.satuan);
        if (itUnit !== unitNorm) return false; // SATUAN HARUS PERSIS SAMA!

        return (itNorm.length >= 8 && itemNorm.includes(itNorm)) ||
               (itemNorm.length >= 8 && itNorm.includes(itemNorm));
      });
      if (strictMatch) return `${preferredCat.id}::${strictMatch.key}`;
    }

    // Jika tidak ada item yang persis sesuai di BoQ, DEFAULT SELALU BUAT ITEM BARU OTOMATIS
    return "__new__";
  };

  const handleApply = (queueId) => {
    const item = pendingItems.find(q => q.id === queueId);
    if (!item) return;
    const target = getTargetFor(item);
    applyPendingItem(queueId, target);
  };

  const handleApplyAll = () => {
    const targetMap = {};
    pendingItems.forEach(item => {
      targetMap[item.id] = getTargetFor(item);
    });
    applyAllPendingItems(targetMap);
  };

  const getCategoryName = (catId) => {
    const found = resolveTargetCategory(catId);
    return found ? found.name : 'Pekerjaan Struktur';
  };

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-br from-terracotta-50 via-amber-50 to-orange-50 border-2 border-terracotta-400/40 p-4 sm:p-5 shadow-blueprint text-paper-900 animate-slideDown">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-terracotta-200/80 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-terracotta-500 text-white flex items-center justify-center shadow-sm">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm tracking-wide text-terracotta-800 uppercase flex items-center gap-2">
              <span>Usulan Material dari Kalkulator</span>
              <span className="px-2 py-0.5 rounded-full bg-terracotta-600 text-white font-mono text-xs font-bold">
                {pendingItems.length}
              </span>
            </h3>
            <p className="text-xs text-paper-700">
              Otomatis membuat item baru dengan nama, satuan, dan harga dari kalkulator jika belum ada di BoQ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApplyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-semibold font-display shadow transition-all transform hover:-translate-y-0.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Terapkan Semua
          </button>
          
          <button
            type="button"
            onClick={clearAllPendingItems}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-terracotta-300 text-terracotta-800 text-xs font-medium transition-all"
            title="Hapus semua usulan antrian"
          >
            <X className="w-3.5 h-3.5" />
            Kosongkan
          </button>
        </div>
      </div>

      {/* Queue items list */}
      <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
        {pendingItems.map((p) => {
          const currentTarget = getTargetFor(p);
          const isNewItem = currentTarget === '__new__';

          return (
            <div 
              key={p.id}
              className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-terracotta-200/90 shadow-sm hover:border-terracotta-400 transition-all"
            >
              {/* Info */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-paper-900">{p.label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-terracotta-100 text-terracotta-700 font-bold border border-terracotta-300/60">
                    {formatNumber(p.jumlah, 3)} {p.satuan}
                  </span>
                  {p.harga > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                      @{formatNumber(p.harga)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-paper-600 font-sans">
                  <span>Sumber: <b className="font-medium text-blueprint-700">{p.source}</b></span>
                  {p.harga > 0 && (
                    <span className="font-mono text-emerald-700 font-medium">
                      · Est: Rp {formatNumber(p.harga * p.jumlah)}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                    isNewItem 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' 
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-300'
                  }`}>
                    {isNewItem ? <PlusCircle className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                    {isNewItem ? 'Item Baru Sesuai Kalkulator' : 'Digabung ke Item BoQ'}
                  </span>
                </div>
              </div>

              {/* Target Selector */}
              <div className="flex-1 min-w-[220px] max-w-md">
                <select
                  value={currentTarget}
                  onChange={(e) => handleSelectChange(p.id, e.target.value)}
                  className={`w-full text-xs font-sans p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blueprint-500 ${
                    isNewItem 
                      ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 font-semibold' 
                      : 'border-paper-400 bg-paper-50 text-paper-900'
                  }`}
                >
                  <option value="__new__">
                    ✨ + Buat Item Baru: "{p.label}" [{p.satuan}] @Rp {formatNumber(p.harga)} di {getCategoryName(p.category)}
                  </option>
                  {(categories || []).map(cat => (
                    <optgroup key={cat?.id} label={`Kategori: ${cat?.name || 'Kategori'}`}>
                      {(Array.isArray(cat?.items) ? cat.items : []).map(it => (
                        <option key={it?.key} value={`${cat?.id}::${it?.key}`}>
                          Gabung ke: {it?.uraian || "(Tanpa Nama)"} [{it?.satuan || "satuan"}]
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleApply(p.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blueprint-600 hover:bg-blueprint-700 text-white text-xs font-semibold font-display shadow-sm transition-all"
                  title="Terapkan ke BoQ"
                >
                  <Check className="w-3.5 h-3.5" />
                  Terapkan
                </button>

                <button
                  type="button"
                  onClick={() => dismissPendingItem(p.id)}
                  className="p-1.5 rounded-lg border border-paper-300 hover:border-red-400 text-paper-600 hover:text-red-600 hover:bg-red-50 transition-all"
                  title="Buang usulan ini"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

