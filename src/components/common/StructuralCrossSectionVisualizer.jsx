import React, { useState } from 'react';
import { 
  Maximize2, 
  Layers, 
  Box, 
  Sliders, 
  Info, 
  Eye, 
  EyeOff, 
  Compass,
  Grid,
  Sparkles
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

/**
 * StructuralCrossSectionVisualizer
 * Diagram teknis CAD interaktif dengan penskalaan matematis presisi 100%
 * sesuai input angka riil dari pengguna:
 * - Balok & Sloof Beton (2D Potongan & 3D Isometrik)
 * - Kolom Struktur (2D Potongan & 3D Isometrik)
 * - Pelat Lantai (2D Potongan Profil Bondek / Kayu)
 * - Pondasi Telapak / Footplat (2D Potongan Samping, 2D Denah Tulangan Tampak Atas, & 3D Isometrik)
 * - Pondasi Batu Kali (2D Potongan Trapesium Pasangan Batu, Aanstamping, & Pasir Urug)
 */
export function StructuralCrossSectionVisualizer({
  type = 'balok', // 'balok' | 'sloof' | 'kolom' | 'pelat' | 'footplat' | 'batukali'
  params = {}
}) {
  // Mode tampilan: '2d' | '3d' | 'top' (khusus footplat)
  const [viewMode, setViewMode] = useState('2d');
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Parsing angka input (dengan fallback default cerdas jika pengguna belum mengisi form)
  const isCustomInput = Boolean(
    (type === 'kolom' && (params.width || params.height)) ||
    ((type === 'balok' || type === 'sloof') && (params.width || params.height)) ||
    (type === 'pelat' && params.height) ||
    (type === 'footplat' && (params.fpP || params.fpL || params.fpT)) ||
    (type === 'batukali' && (params.bkLebarAtas || params.bkLebarBawah || params.bkTinggi))
  );

  // Parameter Balok / Sloof / Kolom (dalam cm & m)
  const widthCm = Math.max(8, parseFloat(params.width) || (type === 'kolom' ? 20 : 15));
  const heightCm = Math.max(8, parseFloat(params.height) || (type === 'kolom' ? 20 : type === 'pelat' ? 12 : 25));
  const lengthM = Math.max(0.5, parseFloat(params.length) || (type === 'kolom' ? 3.5 : 4.0));
  const coverCm = Math.max(1.5, Math.min(5, parseFloat(params.cover) || (type === 'kolom' ? 3.0 : 2.5)));
  const mainDiaMm = parseInt(params.mainDia, 10) || 12;
  const stirrupDiaMm = parseInt(params.stirrupDia, 10) || 8;
  const stirrupSpacingMm = parseInt(params.stirrupSpacing, 10) || 150;

  // Parameter Pelat Lantai
  const pelatMetode = params.metode || 'bondek';

  // Parameter Footplat (m & cm)
  const fpP_m = Math.max(0.4, parseFloat(params.fpP) || 1.0);
  const fpL_m = Math.max(0.4, parseFloat(params.fpL) || 1.0);
  const fpT_m = Math.max(0.12, parseFloat(params.fpT) || 0.25);
  const fpDiaX = parseInt(params.fpDiaX, 10) || 12;
  const fpJarakX = Math.max(50, parseInt(params.fpJarakX, 10) || 150); // mm
  const fpDiaY = parseInt(params.fpDiaY, 10) || 12;
  const fpJarakY = Math.max(50, parseInt(params.fpJarakY, 10) || 150); // mm
  const fpHasLeher = Boolean(params.fpTLeher !== undefined ? params.fpTLeher : true);
  const fpLeherB_m = Math.max(0.15, parseFloat(params.fpLeherLebar) || 0.25);
  const fpLeherH_m = Math.max(0.2, parseFloat(params.fpLeherTinggi) || 0.8);

  // Parameter Batu Kali (m)
  const bkAtas_m = Math.max(0.15, parseFloat(params.bkLebarAtas) || 0.3);
  const bkBawah_m = Math.max(bkAtas_m, parseFloat(params.bkLebarBawah) || 0.6);
  const bkTinggi_m = Math.max(0.3, parseFloat(params.bkTinggi) || 0.8);
  const bkAan_m = Math.max(0.05, parseFloat(params.bkAanTebal) || 0.2);
  const bkPasir_m = Math.max(0.03, parseFloat(params.bkUrugTebal) || 0.05);

  const getTitle = () => {
    switch (type) {
      case 'balok': return `Penampang Balok: ${widthCm} × ${heightCm} cm`;
      case 'sloof': return `Penampang Sloof: ${widthCm} × ${heightCm} cm`;
      case 'kolom': return `Penampang Kolom: ${widthCm} × ${heightCm} cm`;
      case 'pelat': return `Penampang Pelat Lantai: Tebal ${heightCm} cm`;
      case 'footplat': return `Pondasi Telapak: ${fpP_m} × ${fpL_m} m (Tebal ${Math.round(fpT_m * 100)} cm)`;
      case 'batukali': return `Potongan Batu Kali: T.${bkTinggi_m} m (Atas ${Math.round(bkAtas_m*100)} / Bawah ${Math.round(bkBawah_m*100)} cm)`;
      default: return 'Diagram Penampang Struktur CAD';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 text-white shadow-xl flex flex-col space-y-3 font-sans overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-heading text-xs sm:text-sm font-bold text-slate-100">
                {getTitle()}
              </h4>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isCustomInput 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
              }`}>
                {isCustomInput ? '● Skala Input Aktif' : 'Standar Default'}
              </span>
            </div>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Tab Selector */}
          <div className="inline-flex rounded-xl bg-slate-800 p-0.5 border border-slate-700 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewMode === '2d' 
                  ? 'bg-blue-600 text-white font-bold shadow-xs' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Penampang 2D
            </button>

            {type === 'footplat' && (
              <button
                type="button"
                onClick={() => setViewMode('top')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  viewMode === 'top' 
                    ? 'bg-amber-600 text-white font-bold shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Denah Anyaman
              </button>
            )}

            {type !== 'pelat' && type !== 'batukali' && (
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  viewMode === '3d' 
                    ? 'bg-indigo-600 text-white font-bold shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Isometrik 3D
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showAnnotations 
                ? 'bg-slate-800 border-slate-600 text-amber-300' 
                : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            title={showAnnotations ? 'Sembunyikan dimensi ukuran' : 'Tampilkan dimensi ukuran'}
          >
            {showAnnotations ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Interactive CAD Canvas */}
      <div className="relative w-full h-64 sm:h-72 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center p-2 overflow-hidden select-none">
        {/* CAD Grid Background Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cadGrid)" />
        </svg>

        {/* Dynamic Graphic SVG Render */}
        <div className="w-full h-full flex items-center justify-center relative z-10">
          {type === 'balok' || type === 'sloof' ? (
            viewMode === '2d' 
              ? renderDynamicBeam2D(widthCm, heightCm, coverCm, mainDiaMm, stirrupDiaMm, stirrupSpacingMm, showAnnotations)
              : renderDynamicBeam3D(widthCm, heightCm, lengthM, stirrupSpacingMm, showAnnotations)
          ) : type === 'kolom' ? (
            viewMode === '2d'
              ? renderDynamicColumn2D(widthCm, heightCm, coverCm, mainDiaMm, stirrupDiaMm, stirrupSpacingMm, showAnnotations)
              : renderDynamicColumn3D(widthCm, heightCm, lengthM, showAnnotations)
          ) : type === 'pelat' ? (
            renderDynamicSlab2D(heightCm, pelatMetode, showAnnotations)
          ) : type === 'footplat' ? (
            viewMode === '2d'
              ? renderDynamicFootplat2D(fpP_m, fpL_m, fpT_m, fpDiaX, fpJarakX, fpDiaY, fpJarakY, fpHasLeher, fpLeherB_m, fpLeherH_m, showAnnotations)
              : viewMode === 'top'
                ? renderDynamicFootplatTopView(fpP_m, fpL_m, fpDiaX, fpJarakX, fpDiaY, fpJarakY, fpHasLeher, fpLeherB_m, showAnnotations)
                : renderDynamicFootplat3D(fpP_m, fpL_m, fpT_m, fpLeherB_m, fpLeherH_m, showAnnotations)
          ) : type === 'batukali' ? (
            renderDynamicBatuKali2D(bkAtas_m, bkBawah_m, bkTinggi_m, bkAan_m, bkPasir_m, showAnnotations)
          ) : null}
        </div>

        {/* Floating Real-time Input HUD */}
        <div className="absolute bottom-2 left-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-300 pointer-events-none flex items-center gap-2 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {type === 'batukali' 
              ? `Atas: ${Math.round(bkAtas_m*100)}cm | Bawah: ${Math.round(bkBawah_m*100)}cm | Tinggi: ${Math.round(bkTinggi_m*100)}cm`
              : type === 'footplat'
                ? `P×L: ${fpP_m}×${fpL_m}m | Tebal: ${Math.round(fpT_m*100)}cm | Jarak Rebar: ${fpJarakX}mm`
                : type === 'pelat'
                  ? `Tebal: ${heightCm}cm | Profil: ${pelatMetode.toUpperCase()}`
                  : `Lebar (b): ${widthCm}cm | Tinggi (h): ${heightCm}cm | Rasio: ${(widthCm/heightCm).toFixed(2)}`
            }
          </span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 1. BALOK & SLOOF 2D: PENSKALAAN MATEMATIS PERSIS (b x h)
 * ========================================================================= */
function renderDynamicBeam2D(b, h, cover, dMain, dStirrup, sStirrup, showAnno) {
  const vbW = 380;
  const vbH = 260;
  const cx = 190;
  const cy = 130;

  // Skala proporsional presisi (maksimal box 240 x 180 px)
  const maxAllowW = 240;
  const maxAllowH = 180;
  const scale = Math.min(maxAllowW / b, maxAllowH / h);

  const wPx = b * scale;
  const hPx = h * scale;
  const covPx = Math.max(4, Math.min(wPx * 0.2, cover * scale));

  const x1 = cx - wPx / 2;
  const y1 = cy - hPx / 2;

  // Koordinat Sengkang (Stirrup)
  const sx = x1 + covPx;
  const sy = y1 + covPx;
  const sw = Math.max(10, wPx - covPx * 2);
  const sh = Math.max(10, hPx - covPx * 2);

  // Jumlah tulangan dinamis sesuai lebar penampang
  const numTop = b >= 30 ? 3 : 2;
  const numBottom = b >= 35 ? 4 : b >= 25 ? 3 : 2;
  const hasSideBars = h >= 40; // Tulangan pinggang bila tinggi balok >= 40 cm (Standar SNI)

  const barRadius = Math.max(3.5, Math.min(8, (dMain / 10) * scale * 1.2));

  // Hitung posisi tulangan atas
  const topBars = [];
  for (let i = 0; i < numTop; i++) {
    const frac = numTop === 1 ? 0.5 : i / (numTop - 1);
    topBars.push({
      x: sx + barRadius + frac * (sw - 2 * barRadius),
      y: sy + barRadius
    });
  }

  // Hitung posisi tulangan bawah
  const bottomBars = [];
  for (let i = 0; i < numBottom; i++) {
    const frac = numBottom === 1 ? 0.5 : i / (numBottom - 1);
    bottomBars.push({
      x: sx + barRadius + frac * (sw - 2 * barRadius),
      y: sy + sh - barRadius
    });
  }

  // Tulangan pinggang
  const sideBars = [];
  if (hasSideBars) {
    sideBars.push({ x: sx + barRadius, y: sy + sh / 2 });
    sideBars.push({ x: sx + sw - barRadius, y: sy + sh / 2 });
  }

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full">
      {/* 1. Beton Padat (Concrete Core) */}
      <rect 
        x={x1} 
        y={y1} 
        width={wPx} 
        height={hPx} 
        fill="#334155" 
        stroke="#94a3b8" 
        strokeWidth="2.5" 
        rx="3"
      />

      {/* 2. Sengkang Begel (Stirrup Rebar) */}
      <rect 
        x={sx} 
        y={sy} 
        width={sw} 
        height={sh} 
        fill="none" 
        stroke="#f59e0b" 
        strokeWidth="2" 
        strokeDasharray="4 1"
        rx="3"
      />

      {/* Kait Sengkang 135 Derajat di sudut atas */}
      <path 
        d={`M ${sx + 8} ${sy} L ${sx} ${sy} L ${sx} ${sy + 8}`} 
        fill="none" 
        stroke="#f59e0b" 
        strokeWidth="2.5" 
      />

      {/* 3. Tulangan Pokok Atas */}
      {topBars.map((bar, i) => (
        <circle 
          key={`tb-${i}`} 
          cx={bar.x} 
          cy={bar.y} 
          r={barRadius} 
          fill="#38bdf8" 
          stroke="#0284c7" 
          strokeWidth="1.5" 
        />
      ))}

      {/* 4. Tulangan Pokok Bawah */}
      {bottomBars.map((bar, i) => (
        <circle 
          key={`bb-${i}`} 
          cx={bar.x} 
          cy={bar.y} 
          r={barRadius} 
          fill="#38bdf8" 
          stroke="#0284c7" 
          strokeWidth="1.5" 
        />
      ))}

      {/* 5. Tulangan Pinggang (Jika h >= 40cm) */}
      {sideBars.map((bar, i) => (
        <circle 
          key={`sb-${i}`} 
          cx={bar.x} 
          cy={bar.y} 
          r={barRadius * 0.85} 
          fill="#a855f7" 
          stroke="#7e22ce" 
          strokeWidth="1.5" 
        />
      ))}

      {/* 6. Dimensi Ukuran & Notasi CAD */}
      {showAnno && (
        <g className="text-[11px] font-mono select-none">
          {/* Garis Dimensi Lebar b (Bawah) */}
          <line x1={x1} y1={y1 + hPx + 16} x2={x1 + wPx} y2={y1 + hPx + 16} stroke="#cbd5e1" strokeWidth="1.2" />
          <line x1={x1} y1={y1 + hPx + 10} x2={x1} y2={y1 + hPx + 22} stroke="#cbd5e1" strokeWidth="1.2" />
          <line x1={x1 + wPx} y1={y1 + hPx + 10} x2={x1 + wPx} y2={y1 + hPx + 22} stroke="#cbd5e1" strokeWidth="1.2" />
          <text x={cx} y={y1 + hPx + 32} textAnchor="middle" fill="#f8fafc" fontWeight="bold">
            b = {b} cm
          </text>

          {/* Garis Dimensi Tinggi h (Kanan) */}
          <line x1={x1 + wPx + 16} y1={y1} x2={x1 + wPx + 16} y2={y1 + hPx} stroke="#cbd5e1" strokeWidth="1.2" />
          <line x1={x1 + wPx + 10} y1={y1} x2={x1 + wPx + 22} y2={y1} stroke="#cbd5e1" strokeWidth="1.2" />
          <line x1={x1 + wPx + 10} y1={y1 + hPx} x2={x1 + wPx + 22} y2={y1 + hPx} stroke="#cbd5e1" strokeWidth="1.2" />
          <text x={x1 + wPx + 24} y={cy + 4} textAnchor="start" fill="#f8fafc" fontWeight="bold">
            h = {h} cm
          </text>

          {/* Notasi Tulangan Atas */}
          <text x={x1 - 12} y={sy + 4} textAnchor="end" fill="#38bdf8" fontSize="10">
            {numTop}-D{dMain}
          </text>
          <line x1={x1 - 10} y1={sy} x2={sx} y2={sy} stroke="#38bdf8" strokeWidth="1" />

          {/* Notasi Tulangan Bawah */}
          <text x={x1 - 12} y={sy + sh + 2} textAnchor="end" fill="#38bdf8" fontSize="10">
            {numBottom}-D{dMain}
          </text>
          <line x1={x1 - 10} y1={sy + sh} x2={sx} y2={sy + sh} stroke="#38bdf8" strokeWidth="1" />

          {/* Notasi Begel */}
          <text x={cx} y={y1 - 10} textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold">
            Sengkang Begel Ø{dStirrup}-{sStirrup}
          </text>
        </g>
      )}
    </svg>
  );
}

/* =========================================================================
 * 2. BALOK & SLOOF 3D: ISOMETRIK DINAMIS MENGIKUTI b, h, DAN BENTANG L
 * ========================================================================= */
function renderDynamicBeam3D(b, h, lengthM, stirrupSpacingMm, showAnno) {
  const vbW = 380;
  const vbH = 260;

  // Hitung proporsi 3D
  const maxDim = Math.max(b, h);
  const scale = Math.min(100 / maxDim, 3.5);
  const bPx = Math.max(25, Math.min(70, b * scale));
  const hPx = Math.max(25, Math.min(90, h * scale));

  // Panjang isometrik (L)
  const lPx = Math.max(120, Math.min(190, lengthM * 24));
  const angle = 0.52; // ~30 derajat
  const dx = lPx * Math.cos(angle);
  const dy = lPx * Math.sin(angle);

  // Titik muka depan
  const fx = 75;
  const fy = 140;

  // 4 Titik Muka Depan
  const p1 = { x: fx, y: fy };
  const p2 = { x: fx + bPx, y: fy };
  const p3 = { x: fx + bPx, y: fy + hPx };
  const p4 = { x: fx, y: fy + hPx };

  // 4 Titik Muka Belakang (Terekstrusi ke kanan atas)
  const q1 = { x: p1.x + dx, y: p1.y - dy };
  const q2 = { x: p2.x + dx, y: p2.y - dy };
  const q3 = { x: p3.x + dx, y: p3.y - dy };
  const q4 = { x: p4.x + dx, y: p4.y - dy };

  // Cincin Sengkang Berulang sepanjang balok
  const numRings = Math.max(3, Math.min(8, Math.round(lengthM / (stirrupSpacingMm / 1000))));

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full">
      {/* Bidang Belakang Wireframe */}
      <polygon 
        points={`${p1.x},${p1.y} ${q1.x},${q1.y} ${q2.x},${q2.y} ${p2.x},${p2.y}`} 
        fill="#475569" 
        stroke="#94a3b8" 
        strokeWidth="1.5" 
      />
      <polygon 
        points={`${p2.x},${p2.y} ${q2.x},${q2.y} ${q3.x},${q3.y} ${p3.x},${p3.y}`} 
        fill="#1e293b" 
        stroke="#475569" 
        strokeWidth="1.5" 
      />
      <polygon 
        points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`} 
        fill="#334155" 
        stroke="#64748b" 
        strokeWidth="1.8" 
      />

      {/* Rangkaian Cincin Begel Sengkang 3D */}
      {Array.from({ length: numRings }).map((_, idx) => {
        const t = (idx + 0.5) / numRings;
        const rx = fx + t * dx + 6;
        const ry = fy - t * dy + 6;
        const rw = bPx - 12;
        const rh = hPx - 12;

        return (
          <polygon 
            key={idx}
            points={`${rx},${ry} ${rx + rw},${ry} ${rx + rw},${ry + rh} ${rx},${ry + rh}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.2"
            opacity={0.85}
          />
        );
      })}

      {/* 4 Garis Tulangan Longitudinal Menembus Balok */}
      <line x1={p1.x + 8} y1={p1.y + 8} x2={q1.x + 8} y2={q1.y + 8} stroke="#38bdf8" strokeWidth="2.2" />
      <line x1={p2.x - 8} y1={p2.y + 8} x2={q2.x - 8} y2={q2.y + 8} stroke="#38bdf8" strokeWidth="2.2" />
      <line x1={p4.x + 8} y1={p4.y - 8} x2={q4.x + 8} y2={q4.y - 8} stroke="#38bdf8" strokeWidth="2.2" />
      <line x1={p3.x - 8} y1={p3.y - 8} x2={q3.x - 8} y2={q3.y - 8} stroke="#38bdf8" strokeWidth="2.2" />

      {/* Keterangan Ukuran */}
      {showAnno && (
        <g className="text-[11px] font-mono fill-slate-300">
          <text x={fx + bPx / 2} y={fy + hPx + 18} textAnchor="middle" fill="#f8fafc" fontWeight="bold">
            b = {b} cm
          </text>
          <text x={fx - 14} y={fy + hPx / 2} textAnchor="end" fill="#f8fafc" fontWeight="bold">
            h = {h} cm
          </text>
          <text x={q1.x - 10} y={q1.y - 12} textAnchor="middle" fill="#38bdf8" fontWeight="bold">
            Bentang L = {lengthM} m ({numRings} Ring Begel)
          </text>
        </g>
      )}
    </svg>
  );
}

/* =========================================================================
 * 3. KOLOM STRUKTUR 2D: PENSKALAAN PERSIS SESUAI b x h
 * ========================================================================= */
function renderDynamicColumn2D(b, h, cover, dMain, dStirrup, sStirrup, showAnno) {
  const vbW = 380;
  const vbH = 260;
  const cx = 190;
  const cy = 130;

  const maxDim = Math.max(b, h);
  const scale = Math.min(220 / maxDim, 5.0);
  const wPx = b * scale;
  const hPx = h * scale;
  const covPx = Math.max(5, Math.min(wPx * 0.25, cover * scale));

  const x1 = cx - wPx / 2;
  const y1 = cy - hPx / 2;

  const sx = x1 + covPx;
  const sy = y1 + covPx;
  const sw = Math.max(10, wPx - covPx * 2);
  const sh = Math.max(10, hPx - covPx * 2);

  const barRadius = Math.max(4, Math.min(8, (dMain / 10) * scale * 1.3));

  // Titik tulangan kolom (4 sudut wajib + tulangan sisi jika kolom besar)
  const bars = [
    { x: sx + barRadius, y: sy + barRadius },
    { x: sx + sw - barRadius, y: sy + barRadius },
    { x: sx + barRadius, y: sy + sh - barRadius },
    { x: sx + sw - barRadius, y: sy + sh - barRadius }
  ];

  if (b >= 25) {
    bars.push({ x: sx + sw / 2, y: sy + barRadius });
    bars.push({ x: sx + sw / 2, y: sy + sh - barRadius });
  }
  if (h >= 25) {
    bars.push({ x: sx + barRadius, y: sy + sh / 2 });
    bars.push({ x: sx + sw - barRadius, y: sy + sh / 2 });
  }

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full">
      <rect 
        x={x1} 
        y={y1} 
        width={wPx} 
        height={hPx} 
        fill="#334155" 
        stroke="#94a3b8" 
        strokeWidth="2.5" 
        rx="2"
      />

      <rect 
        x={sx} 
        y={sy} 
        width={sw} 
        height={sh} 
        fill="none" 
        stroke="#f59e0b" 
        strokeWidth="2" 
        strokeDasharray="4 1"
        rx="3"
      />

      {bars.map((bar, i) => (
        <circle 
          key={i} 
          cx={bar.x} 
          cy={bar.y} 
          r={barRadius} 
          fill="#38bdf8" 
          stroke="#0284c7" 
          strokeWidth="1.5" 
        />
      ))}

      {showAnno && (
        <g className="text-[11px] font-mono select-none">
          <text x={cx} y={y1 + hPx + 24} textAnchor="middle" fill="#f8fafc" fontWeight="bold">
            {b} × {h} cm (Selimut {cover} cm)
          </text>
          <text x={cx} y={y1 - 10} textAnchor="middle" fill="#38bdf8" fontWeight="bold">
            {bars.length}-D{dMain} &bull; Sengkang Ø{dStirrup}-{sStirrup}
          </text>
        </g>
      )}
    </svg>
  );
}

/* =========================================================================
 * 4. KOLOM STRUKTUR 3D ISOMETRIK
 * ========================================================================= */
function renderDynamicColumn3D(b, h, lengthM, showAnno) {
  const vbW = 380;
  const vbH = 260;

  const maxDim = Math.max(b, h);
  const scale = Math.min(80 / maxDim, 3.5);
  const wPx = Math.max(30, b * scale);
  const dPx = Math.max(30, h * scale);
  const colHeight = Math.max(120, Math.min(180, lengthM * 35));

  const cx = 175;
  const cy = 200;

  // Top Face points
  const t1 = { x: cx, y: cy - colHeight };
  const t2 = { x: cx + wPx, y: cy - colHeight - 18 };
  const t3 = { x: cx + wPx - dPx * 0.6, y: cy - colHeight - 34 };
  const t4 = { x: cx - dPx * 0.6, y: cy - colHeight - 16 };

  // Bottom Face points
  const b1 = { x: cx, y: cy };
  const b2 = { x: cx + wPx, y: cy - 18 };
  const b4 = { x: cx - dPx * 0.6, y: cy - 16 };

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full">
      {/* Top Cap */}
      <polygon 
        points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`} 
        fill="#64748b" 
        stroke="#94a3b8" 
        strokeWidth="1.5" 
      />
      {/* Front Face */}
      <polygon 
        points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${b2.x},${b2.y} ${b1.x},${b1.y}`} 
        fill="#334155" 
        stroke="#64748b" 
        strokeWidth="1.5" 
      />
      {/* Left Face */}
      <polygon 
        points={`${t1.x},${t1.y} ${t4.x},${t4.y} ${b4.x},${b4.y} ${b1.x},${b1.y}`} 
        fill="#1e293b" 
        stroke="#475569" 
        strokeWidth="1.5" 
      />

      {/* Begel Ring Horizontal */}
      {[0.25, 0.5, 0.75].map((frac, idx) => {
        const yOffset = colHeight * frac;
        return (
          <path 
            key={idx}
            d={`M ${b4.x} ${b4.y - yOffset} L ${b1.x} ${b1.y - yOffset} L ${b2.x} ${b2.y - yOffset}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeDasharray="4 2"
          />
        );
      })}

      {showAnno && (
        <g className="text-[11px] font-mono fill-slate-300">
          <text x={cx + wPx + 15} y={cy - colHeight / 2} textAnchor="start" fill="#38bdf8" fontWeight="bold">
            Tinggi H = {lengthM} m
          </text>
          <text x={cx + wPx / 2} y={cy + 16} textAnchor="middle" fill="#f8fafc" fontWeight="bold">
            {b} × {h} cm
          </text>
        </g>
      )}
    </svg>
  );
}

/* =========================================================================
 * 5. PELAT LANTAI 2D (SLAB DENGAN PROPORSI TEBAL TS)
 * ========================================================================= */
function renderDynamicSlab2D(thickness, metode, showAnno) {
  const vbW = 380;
  const vbH = 260;
  const isBondek = metode === 'bondek';

  // Tebal pelat proporsional
  const scale = 5.5;
  const tPx = Math.max(35, Math.min(85, thickness * scale));
  const wPx = 300;
  const x1 = 40;
  const y1 = 110 - tPx / 2;

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full">
      {/* Beton Pelat Cor */}
      <rect 
        x={x1} 
        y={y1} 
        width={wPx} 
        height={tPx} 
        fill="#334155" 
        stroke="#94a3b8" 
        strokeWidth="2.5" 
        rx="2"
      />

      {/* Wiremesh Atas & Bawah */}
      <line x1={x1 + 10} y1={y1 + 12} x2={x1 + wPx - 10} y2={y1 + 12} stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 4" />
      <line x1={x1 + 10} y1={y1 + tPx - 12} x2={x1 + wPx - 10} y2={y1 + tPx - 12} stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 4" />

      {/* Titik Rebar Melintang */}
      {Array.from({ length: 9 }).map((_, idx) => {
        const rx = x1 + 25 + idx * 30;
        return (
          <g key={idx}>
            <circle cx={rx} cy={y1 + 12} r="3.5" fill="#38bdf8" stroke="#0284c7" />
            <circle cx={rx} cy={y1 + tPx - 12} r="3.5" fill="#38bdf8" stroke="#0284c7" />
          </g>
        );
      })}

      {/* Profil Bondek atau Bekisting Plywood */}
      {isBondek ? (
        <path 
          d={`M ${x1},${y1 + tPx} L ${x1 + 20},${y1 + tPx} L ${x1 + 35},${y1 + tPx + 16} L ${x1 + 65},${y1 + tPx + 16} L ${x1 + 80},${y1 + tPx} L ${x1 + 110},${y1 + tPx} L ${x1 + 125},${y1 + tPx + 16} L ${x1 + 155},${y1 + tPx + 16} L ${x1 + 170},${y1 + tPx} L ${x1 + 200},${y1 + tPx} L ${x1 + 215},${y1 + tPx + 16} L ${x1 + 245},${y1 + tPx + 16} L ${x1 + 260},${y1 + tPx} L ${x1 + 300},${y1 + tPx}`}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="3"
        />
      ) : (
        <rect x={x1} y={y1 + tPx} width={wPx} height="10" fill="#78350f" stroke="#b45309" strokeWidth="1.5" />
      )}

      {showAnno && (
        <g className="text-[11px] font-mono select-none">
          <text x={190} y={y1 - 12} textAnchor="middle" fill="#f8fafc" fontWeight="bold">
            Tebal Pelat t = {thickness} cm (Wiremesh M8 2 Lapis)
          </text>
          <text x={190} y={y1 + tPx + 38} textAnchor="middle" fill={isBondek ? '#38bdf8' : '#fbbf24'} fontWeight="bold">
            {isBondek ? 'Decking Profil Bondek Baja Bergelombang (0.75mm)' : 'Bekisting Kayu Plywood Konvensional 12mm'}
          </text>
        </g>
      )}
    </svg>
  );
}

/* =========================================================================
 * 6. PONDASI TELAPAK / FOOTPLAT 2D (TAMPAK POTONGAN SAMPING)
 * ========================================================================= */
function renderDynamicFootplat2D(pM, lM, tM, dX, jX, dY, jY, hasLeher, lbM, lhM, showAnno) {
  const vbW = 380;
  const vbH = 260;
  const cx = 190;

  // Skala proporsional telapak (L = lebar telapak, T = tebal pelat)
  const scale = Math.min(260 / lM, 200 / (tM + (hasLeher ? lhM : 0.4)));
  const wFootPx = lM * scale;
  const tFootPx = tM * scale;
  const wPedPx = Math.max(30, Math.min(wFootPx * 0.45, lbM * scale));
  const hPedPx = Math.max(40, (hasLeher ? lhM : 0.5) * scale);

  const yBase = 200;
  const yFootTop = yBase - tFootPx;
  const yPedTop = yFootTop - hPedPx;

  const xFootLeft = cx - wFootPx / 2;

  // Hitung jumlah batang rebar anyaman dasar
  const numBars = Math.max(4, Math.min(14, Math.floor((lM * 1000) / jX) + 1));

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full">
      {/* Pasir Urug 5cm */}
      <rect x={xFootLeft - 10} y={yBase + 12} width={wFootPx + 20} height="12" fill="#d97706" opacity="0.6" stroke="#b45309" strokeWidth="1" />

      {/* Lantai Kerja 5cm */}
      <rect x={xFootLeft - 10} y={yBase} width={wFootPx + 20} height="12" fill="#64748b" stroke="#475569" strokeWidth="1" />

      {/* Pelat Telapak Beton */}
      <rect x={xFootLeft} y={yFootTop} width={wFootPx} height={tFootPx} fill="#334155" stroke="#94a3b8" strokeWidth="2.5" />

      {/* Kolom Pedestal Leher */}
      <rect x={cx - wPedPx / 2} y={yPedTop} width={wPedPx} height={hPedPx} fill="#475569" stroke="#94a3b8" strokeWidth="2.5" />

      {/* Anyaman Rebar Tulangan Bawah */}
      <line x1={xFootLeft + 8} y1={yBase - 8} x2={xFootLeft + wFootPx - 8} y2={yBase - 8} stroke="#38bdf8" strokeWidth="2.5" />
      {Array.from({ length: numBars }).map((_, idx) => {
        const frac = numBars === 1 ? 0.5 : idx / (numBars - 1);
        const rx = xFootLeft + 12 + frac * (wFootPx - 24);
        return <circle key={idx} cx={rx} cy={yBase - 8} r="3.5" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />;
      })}

      {/* Stek Tulangan Kolom Pedestal Membelok (L-Dowel Hook) */}
      <path 
        d={`M ${cx - wPedPx / 2 + 8} ${yPedTop + 5} L ${cx - wPedPx / 2 + 8} ${yBase - 12} L ${xFootLeft + 16} ${yBase - 12}`} 
        fill="none" 
        stroke="#38bdf8" 
        strokeWidth="2.2" 
      />
      <path 
        d={`M ${cx + wPedPx / 2 - 8} ${yPedTop + 5} L ${cx + wPedPx / 2 - 8} ${yBase - 12} L ${xFootLeft + wFootPx - 16} ${yBase - 12}`} 
        fill="none" 
        stroke="#38bdf8" 
        strokeWidth="2.2" 
      />

      {showAnno && (
        <g className="text-[11px] font-mono select-none">
          <text x={cx} y={yBase + 36} textAnchor="middle" fill="#f8fafc" fontWeight="bold">
            Lebar Telapak L = {lM} m &bull; Tebal = {Math.round(tM * 100)} cm
          </text>
          <text x={cx} y={yPedTop - 8} textAnchor="middle" fill="#38bdf8" fontWeight="bold">
            Pedestal {Math.round(lbM * 100)}×{Math.round(lbM * 100)} cm (H.{Math.round(lhM * 100)}cm)
          </text>
          <text x={cx} y={yFootTop + tFootPx / 2 + 4} textAnchor="middle" fill="#fbbf24" fontSize="10">
            {numBars} Titik Rebar D{dX}-{jX} (Bawah)
          </text>
        </g>
      )}
    </svg>
  );
}

/* =========================================================================
 * 7. PONDASI TELAPAK: DENAH TAMPAK ATAS ANYAMAN TULANGAN (TOP VIEW)
 * ========================================================================= */
function renderDynamicFootplatTopView(pM, lM, dX, jX, dY, jY, hasLeher, lbM, showAnno) {
  const vbW = 380;
  const vbH = 260;
  const cx = 190;
  const cy = 130;

  const maxM = Math.max(pM, lM);
  const scale = Math.min(220 / maxM, 160);
  const wPx = lM * scale;
  const hPx = pM * scale;
  const x1 = cx - wPx / 2;
  const y1 = cy - hPx / 2;

  const pedPx = Math.max(25, Math.min(wPx * 0.4, lbM * scale));

  const numX = Math.max(3, Math.floor((lM * 1000) / jX) + 1);
  const numY = Math.max(3, Math.floor((pM * 1000) / jY) + 1);

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full">
      {/* Dasar Telapak Beton */}
      <rect x={x1} y={y1} width={wPx} height={hPx} fill="#334155" stroke="#94a3b8" strokeWidth="2.5" />

      {/* Grid Tulangan Arah Y (Garis Vertikal) */}
      {Array.from({ length: numX }).map((_, idx) => {
        const frac = numX === 1 ? 0.5 : idx / (numX - 1);
        const gx = x1 + 10 + frac * (wPx - 20);
        return <line key={`gx-${idx}`} x1={gx} y1={y1 + 8} x2={gx} y2={y1 + hPx - 8} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 1" />;
      })}

      {/* Grid Tulangan Arah X (Garis Horizontal) */}
      {Array.from({ length: numY }).map((_, idx) => {
        const frac = numY === 1 ? 0.5 : idx / (numY - 1);
        const gy = y1 + 10 + frac * (hPx - 20);
        return <line key={`gy-${idx}`} x1={x1 + 8} y1={gy} x2={x1 + wPx - 8} y2={gy} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 1" />;
      })}

      {/* Kolom Pedestal di Tengah */}
      <rect 
        x={cx - pedPx / 2} 
        y={cy - pedPx / 2} 
        width={pedPx} 
        height={pedPx} 
        fill="#1e293b" 
        stroke="#e2e8f0" 
        strokeWidth="2" 
      />

      {/* 4 Titik Tulangan Kolom Pedestal */}
      <circle cx={cx - pedPx / 2 + 5} cy={cy - pedPx / 2 + 5} r="3" fill="#38bdf8" />
      <circle cx={cx + pedPx / 2 - 5} cy={cy - pedPx / 2 + 5} r="3" fill="#38bdf8" />
      <circle cx={cx - pedPx / 2 + 5} cy={cy + pedPx / 2 - 5} r="3" fill="#38bdf8" />
      <circle cx={cx + pedPx / 2 - 5} cy={cy + pedPx / 2 - 5} r="3" fill="#38bdf8" />

      {showAnno && (
        <g className="text-[11px] font-mono select-none">
          <text x={cx} y={y1 - 10} textAnchor="middle" fill="#f8fafc" fontWeight="bold">
            Denah Anyaman: P.{pM}m × L.{lM}m ({numX}×{numY} Anyaman Rebar)
          </text>
          <text x={cx} y={y1 + hPx + 20} textAnchor="middle" fill="#38bdf8" fontWeight="bold">
            Arah X: D{dX}-{jX} &bull; Arah Y: D{dY}-{jY}
          </text>
        </g>
      )}
    </svg>
  );
}

/* =========================================================================
 * 8. PONDASI TELAPAK 3D ISOMETRIK
 * ========================================================================= */
function renderDynamicFootplat3D(pM, lM, tM, lbM, lhM, showAnno) {
  const vbW = 380;
  const vbH = 260;
  const cx = 190;
  const cy = 175;

  const maxM = Math.max(pM, lM);
  const scale = Math.min(140 / maxM, 110);
  const wFoot = lM * scale;
  const pFoot = pM * scale;
  const tFoot = Math.max(15, Math.min(35, tM * 80));

  const wPed = Math.max(20, lbM * scale * 0.7);
  const hPed = Math.max(40, lhM * 50);

  // Titik Isometrik Plat Dasar
  const f1 = { x: cx - wFoot / 2, y: cy };
  const f2 = { x: cx, y: cy - pFoot * 0.35 };
  const f3 = { x: cx + wFoot / 2, y: cy };
  const f4 = { x: cx, y: cy + pFoot * 0.35 };

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full">
      {/* Base Footing 3D */}
      <polygon points={`${f1.x},${f1.y} ${f2.x},${f2.y} ${f3.x},${f3.y} ${f4.x},${f4.y}`} fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points={`${f1.x},${f1.y} ${f4.x},${f4.y} ${f4.x},${f4.y + tFoot} ${f1.x},${f1.y + tFoot}`} fill="#334155" stroke="#64748b" strokeWidth="1.5" />
      <polygon points={`${f4.x},${f4.y} ${f3.x},${f3.y} ${f3.x},${f3.y + tFoot} ${f4.x},${f4.y + tFoot}`} fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

      {/* Pedestal Box 3D */}
      <polygon 
        points={`${cx - wPed/2},${cy - tFoot} ${cx},${cy - tFoot - wPed*0.35} ${cx + wPed/2},${cy - tFoot} ${cx},${cy - tFoot + wPed*0.35}`} 
        fill="#94a3b8" 
        stroke="#cbd5e1" 
      />
      <polygon 
        points={`${cx - wPed/2},${cy - tFoot - hPed} ${cx},${cy - tFoot - hPed - wPed*0.35} ${cx + wPed/2},${cy - tFoot - hPed} ${cx},${cy - tFoot - hPed + wPed*0.35}`} 
        fill="#cbd5e1" 
        stroke="#e2e8f0" 
      />
      <polygon 
        points={`${cx - wPed/2},${cy - tFoot - hPed} ${cx},${cy - tFoot - hPed + wPed*0.35} ${cx},${cy - tFoot + wPed*0.35} ${cx - wPed/2},${cy - tFoot}`} 
        fill="#64748b" 
        stroke="#475569" 
      />
      <polygon 
        points={`${cx},${cy - tFoot - hPed + wPed*0.35} ${cx + wPed/2},${cy - tFoot - hPed} ${cx + wPed/2},${cy - tFoot} ${cx},${cy - tFoot + wPed*0.35}`} 
        fill="#334155" 
        stroke="#475569" 
      />

      {showAnno && (
        <g className="text-[11px] font-mono fill-slate-300">
          <text x={cx} y={45} textAnchor="middle" fill="#38bdf8" fontWeight="bold">
            Footing 3D: {pM} × {lM} m &bull; Tebal {Math.round(tM * 100)} cm
          </text>
        </g>
      )}
    </svg>
  );
}

/* =========================================================================
 * 9. PONDASI BATU KALI 2D: PROPORSI TRAPESIUM PERSIS SESUAI ANGKA INPUT
 * ========================================================================= */
function renderDynamicBatuKali2D(bAtasM, bBawahM, hM, aanM, pasirM, showAnno) {
  const vbW = 380;
  const vbH = 260;
  const cx = 190;

  // Skala proporsional seluruh elemen batu kali
  const totalH_m = hM + aanM + pasirM;
  const maxW_m = Math.max(bBawahM + 0.25, 0.8);
  const scale = Math.min(280 / maxW_m, 180 / totalH_m);

  const wAtasPx = bAtasM * scale;
  const wBawahPx = bBawahM * scale;
  const hBatuPx = hM * scale;
  const hAanPx = aanM * scale;
  const hPasirPx = pasirM * scale;

  const y1 = 45;
  const y2 = y1 + hBatuPx;
  const y3 = y2 + hAanPx;
  const y4 = y3 + hPasirPx;

  const wAanPx = wBawahPx + 0.2 * scale; // Aanstamping menjorok 10cm di tiap sisi

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-full">
      {/* Pasir Urug Bawah */}
      <rect 
        x={cx - wAanPx / 2} 
        y={y3} 
        width={wAanPx} 
        height={hPasirPx} 
        fill="#d97706" 
        opacity="0.75" 
        stroke="#b45309" 
        strokeWidth="1" 
      />

      {/* Aanstamping Batu Kosong */}
      <rect 
        x={cx - wAanPx / 2} 
        y={y2} 
        width={wAanPx} 
        height={hAanPx} 
        fill="#78716c" 
        stroke="#57534e" 
        strokeWidth="1.5" 
      />
      {Array.from({ length: Math.max(4, Math.floor(wAanPx / 24)) }).map((_, idx) => {
        const rx = cx - wAanPx / 2 + 12 + idx * 24;
        return <circle key={idx} cx={rx} cy={y2 + hAanPx / 2} r={Math.min(11, hAanPx * 0.42)} fill="#a8a29e" stroke="#44403c" strokeWidth="1" />;
      })}

      {/* Trapesium Pasangan Batu Kali Campuran 1:4 */}
      <polygon 
        points={`${cx - wAtasPx / 2},${y1} ${cx + wAtasPx / 2},${y1} ${cx + wBawahPx / 2},${y2} ${cx - wBawahPx / 2},${y2}`}
        fill="#52525b"
        stroke="#e4e4e7"
        strokeWidth="2.5"
      />

      {/* Tekstur Batu Belah Beracak di dalam Trapesium */}
      <circle cx={cx - wAtasPx / 4} cy={y1 + hBatuPx * 0.3} r="10" fill="#71717a" stroke="#3f3f46" />
      <circle cx={cx + wAtasPx / 4} cy={y1 + hBatuPx * 0.25} r="12" fill="#71717a" stroke="#3f3f46" />
      <circle cx={cx} cy={y1 + hBatuPx * 0.55} r="14" fill="#71717a" stroke="#3f3f46" />
      <circle cx={cx - wBawahPx * 0.3} cy={y1 + hBatuPx * 0.75} r="13" fill="#71717a" stroke="#3f3f46" />
      <circle cx={cx + wBawahPx * 0.3} cy={y1 + hBatuPx * 0.75} r="12" fill="#71717a" stroke="#3f3f46" />

      {showAnno && (
        <g className="text-[11px] font-mono select-none">
          {/* Garis Dimensi Lebar Atas */}
          <line x1={cx - wAtasPx / 2} y1={y1 - 6} x2={cx + wAtasPx / 2} y2={y1 - 6} stroke="#cbd5e1" strokeWidth="1" />
          <text x={cx} y={y1 - 12} textAnchor="middle" fill="#f8fafc" fontWeight="bold">
            Atas = {Math.round(bAtasM * 100)} cm
          </text>

          {/* Garis Dimensi Lebar Bawah */}
          <line x1={cx - wBawahPx / 2} y1={y2 + 8} x2={cx + wBawahPx / 2} y2={y2 + 8} stroke="#f59e0b" strokeWidth="1" />
          <text x={cx} y={y4 + 20} textAnchor="middle" fill="#f8fafc" fontWeight="bold">
            Bawah = {Math.round(bBawahM * 100)} cm &bull; Tinggi = {Math.round(hM * 100)} cm
          </text>

          {/* Keterangan Layer Samping */}
          <text x={cx + wAanPx / 2 + 10} y={y2 + hAanPx / 2 + 4} textAnchor="start" fill="#a8a29e" fontSize="9">
            Aanstamping ({Math.round(aanM * 100)}cm)
          </text>
          <text x={cx + wAanPx / 2 + 10} y={y3 + hPasirPx / 2 + 4} textAnchor="start" fill="#f59e0b" fontSize="9">
            Pasir Urug ({Math.round(pasirM * 100)}cm)
          </text>
        </g>
      )}
    </svg>
  );
}
