/**
 * Material Take-off & Bill of Materials (BOM) Calculation Engine
 * SR Studio BoQ & RAB Tools
 * 
 * Mengekstrak dan mendekonstruksi seluruh item pekerjaan di detail RAB/BoQ menjadi:
 * 1. Daftar kebutuhan material riil (BOM & SPO / Surat Pesanan Pembelian Bahan ke Toko)
 * 2. Alokasi HOK Tenaga Kerja Standar SNI PUPR
 */

// Berat jenis besi beton per meter lari: (d^2 / 162) kg/m
export const REBAR_WEIGHT_PER_METER = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  13: 1.042,
  16: 1.578,
  19: 2.226,
  22: 2.984,
  25: 3.853
};

// Berat per lonjor (12m)
export const REBAR_WEIGHT_PER_LONJOR = {
  6: 2.664,
  8: 4.74,
  10: 7.404,
  12: 10.656,
  13: 12.504,
  16: 18.936,
  19: 26.712,
  22: 35.808,
  25: 46.236
};

/**
 * Koefisien SNI Standar untuk Dekomposisi Pekerjaan Gabungan (PUPR)
 * Setiap pekerjaan komposit didekonstruksi menjadi material belanja riil dan HOK tenaga kerja.
 */
export const SNI_DECOMPOSITIONS = [
  // 1. PONDASI BATU KALI / BELAH
  {
    matcher: /^(?=.*(pondasi|pasang|pekerjaan))(?=.*batu.*(kali|belah|kosong|aanstamping)).*$/i,
    category: 'pondasi',
    label: 'Pondasi Batu Kali / Belah',
    unitMatch: /m[³3]/i,
    materials: [
      { name: 'Batu Belah / Batu Kali', unit: 'm³', coef: 1.20, group: 'semen_agregat', priceDefault: 275000 },
      { name: 'Semen Portland (PC)', unit: 'kg', coef: 163.0, group: 'semen_agregat', priceDefault: 1748.75 }, // Rp 69.950 / 40kg
      { name: 'Pasir Pasang', unit: 'm³', coef: 0.52, group: 'semen_agregat', priceDefault: 384800 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 1.50, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Batu', unit: 'OH', coef: 0.75, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.075, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.075, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 2. DINDING BATA MERAH (1:4)
  {
    matcher: /^(?=.*(pasang|pekerjaan|dinding|rollag))(?=.*bata.*merah).*$/i,
    category: 'dinding',
    label: 'Pasangan Dinding Bata Merah',
    unitMatch: /m[²2]/i,
    materials: [
      { name: 'Bata Merah Standar', unit: 'buah', coef: 70.0, group: 'dinding_lantai', priceDefault: 690 },
      { name: 'Semen Portland (PC)', unit: 'kg', coef: 11.5, group: 'semen_agregat', priceDefault: 1748.75 },
      { name: 'Pasir Pasang', unit: 'm³', coef: 0.043, group: 'semen_agregat', priceDefault: 384800 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.30, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Batu', unit: 'OH', coef: 0.10, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.01, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.015, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 3. DINDING BATA RINGAN / HEBEL
  {
    matcher: /^(?=.*(pasang|pekerjaan|dinding))(?=.*(bata.*ringan|hebel)).*$/i,
    category: 'dinding',
    label: 'Pasangan Dinding Bata Ringan Hebel',
    unitMatch: /m[²2]/i,
    materials: [
      { name: 'Bata Ringan / Hebel (T.10cm)', unit: 'buah', coef: 8.33, group: 'dinding_lantai', priceDefault: 9500 },
      { name: 'Semen Mortar Thinbed / Perekat Hebel (40kg)', unit: 'kg', coef: 4.0, group: 'semen_agregat', priceDefault: 2375 } // Rp 95.000 / 40kg
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.20, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Batu', unit: 'OH', coef: 0.10, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.01, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.01, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 4. PLESTERAN DINDING 1:4 (TEBAL 15MM)
  {
    matcher: /plesteran|plester/i,
    category: 'finishing',
    label: 'Plesteran Dinding 1:4',
    unitMatch: /m[²2]/i,
    materials: [
      { name: 'Semen Portland (PC)', unit: 'kg', coef: 6.24, group: 'semen_agregat', priceDefault: 1748.75 },
      { name: 'Pasir Pasang', unit: 'm³', coef: 0.024, group: 'semen_agregat', priceDefault: 384800 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.26, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Batu', unit: 'OH', coef: 0.15, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.015, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.013, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 5. ACIAN DINDING SEMEN
  {
    matcher: /acian|\baci\b/i,
    category: 'finishing',
    label: 'Acian Dinding Semen PC',
    unitMatch: /m[²2]/i,
    materials: [
      { name: 'Semen Portland (PC)', unit: 'kg', coef: 3.25, group: 'semen_agregat', priceDefault: 1748.75 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.20, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Batu', unit: 'OH', coef: 0.10, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.01, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.01, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 6. BETON STRUKTUR COR (K-250 / f'c 20-25 MPa / Kolom, Balok, Sloof, Plat Lantai)
  {
    matcher: /(?=.*(cor|pengecoran|beton|struktur))(?=.*(kolom|balok|sloof|plat|dak|k-?250|k-?225|f'?c.*2[0-5]|struktur)).*/i,
    category: 'struktur',
    label: 'Cor Beton Struktur (Site Mix K-250)',
    unitMatch: /m[³3]/i,
    materials: [
      { name: 'Semen Portland (PC)', unit: 'kg', coef: 384.0, group: 'semen_agregat', priceDefault: 1748.75 },
      { name: 'Pasir Beton', unit: 'm³', coef: 0.49, group: 'semen_agregat', priceDefault: 384800 },
      { name: 'Batu Split / Kerikil 1-2', unit: 'm³', coef: 0.77, group: 'semen_agregat', priceDefault: 380000 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 1.65, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Batu', unit: 'OH', coef: 0.275, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.028, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.083, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 7. LANTAI KERJA / RABAT BETON (f'c 10 MPa / K-125)
  {
    matcher: /lantai.*kerja|rabat.*beton|rabat.*lantai|beton.*f'?c.*10|beton.*k-?125|beton.*k-?100/i,
    category: 'tanah_pondasi',
    label: 'Rabat Beton / Lantai Kerja (K-125)',
    unitMatch: /m[³3]|m[²2]/i,
    materials: [
      { name: 'Semen Portland (PC)', unit: 'kg', coef: 230.0, group: 'semen_agregat', priceDefault: 1748.75 },
      { name: 'Pasir Beton', unit: 'm³', coef: 0.62, group: 'semen_agregat', priceDefault: 384800 },
      { name: 'Batu Split / Kerikil 1-2', unit: 'm³', coef: 0.78, group: 'semen_agregat', priceDefault: 380000 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 1.20, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Batu', unit: 'OH', coef: 0.20, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Mandor', unit: 'OH', coef: 0.06, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 8. URUGAN PASIR BAWAH PONDASI / LANTAI
  {
    matcher: /^(?=.*(pekerjaan|urugan))(?=.*pasir).*$/i,
    category: 'tanah_pondasi',
    label: 'Pekerjaan Urugan Pasir',
    unitMatch: /m[³3]/i,
    materials: [
      { name: 'Pasir Urug', unit: 'm³', coef: 1.20, group: 'semen_agregat', priceDefault: 272300 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.30, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Mandor', unit: 'OH', coef: 0.01, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 9. PEKERJAAN PENGECATAN DINDING (m²)
  {
    matcher: /^(?=.*(pekerjaan|pengecatan|pasang))(?=.*cat.*(dinding|tembok)).*$/i,
    category: 'finishing',
    label: 'Pekerjaan Pengecatan Dinding',
    unitMatch: /m[²2]/i,
    materials: [
      { name: 'Plamir / Cat Dasar Alkali Primer', unit: 'kg', coef: 0.10, group: 'finishing_mep', priceDefault: 47300 },
      { name: 'Cat Penutup Interior/Eksterior', unit: 'kg', coef: 0.26, group: 'finishing_mep', priceDefault: 55400 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.07, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Cat', unit: 'OH', coef: 0.063, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.006, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.003, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 10. PASANG KERAMIK / GRANIT LANTAI (m²)
  {
    matcher: /^(?=.*(pasang|pekerjaan))(?=.*(keramik|granit|ubin|homogenous|marmer)).*$/i,
    category: 'lantai',
    label: 'Pemasangan Keramik / Granit Lantai',
    unitMatch: /m[²2]/i,
    materials: [
      { name: 'Ubin Keramik / Granit Lantai (Waste 5%)', unit: 'm²', coef: 1.05, group: 'dinding_lantai', priceDefault: 85000 },
      { name: 'Semen Portland (PC)', unit: 'kg', coef: 10.0, group: 'semen_agregat', priceDefault: 1748.75 },
      { name: 'Pasir Pasang', unit: 'm³', coef: 0.045, group: 'semen_agregat', priceDefault: 384800 },
      { name: 'Semen Warna / Nat', unit: 'kg', coef: 0.50, group: 'semen_agregat', priceDefault: 13100 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.62, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Pasang Keramik', unit: 'OH', coef: 0.35, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.035, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.03, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 11. PASANG PLAFOND GYPSUM RANGKA HOLLOW (m²)
  {
    matcher: /^(?=.*(pasang|pekerjaan))(?=.*(plafond|plafon|gypsum)).*$/i,
    category: 'plafond',
    label: 'Pemasangan Plafond Gypsum Rangka Hollow',
    unitMatch: /m[²2]/i,
    materials: [
      { name: 'Papan Gipsum 120x240cm', unit: 'lembar', coef: 0.364, group: 'dinding_lantai', priceDefault: 87450 },
      { name: 'Rangka Hollow Galvanis 4x4 (Rangka Plafond)', unit: 'batang', coef: 1.10, group: 'dinding_lantai', priceDefault: 44400 },
      { name: 'Sekrup Gypsum', unit: 'buah', coef: 25.0, group: 'dinding_lantai', priceDefault: 250 },
      { name: 'Compound Gypsum', unit: 'kg', coef: 0.25, group: 'semen_agregat', priceDefault: 3500 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.15, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Kayu', unit: 'OH', coef: 0.25, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.025, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.01, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 12. RANGKA ATAP BAJA RINGAN C75 (m²)
  {
    matcher: /^(?=.*(pasang|pekerjaan|rangka|kuda))(?=.*(baja.*ringan|truss|c75|c-75)).*$/i,
    category: 'atap',
    label: 'Rangka Kuda-Kuda Baja Ringan C75',
    unitMatch: /m[²2]/i,
    materials: [
      { name: 'Baja Ringan Canai Dingin C75', unit: 'batang', coef: 0.65, group: 'besi_baja', priceDefault: 99700 },
      { name: 'Reng Baja Ringan R.32 Tebal 0.45mm', unit: 'batang', coef: 1.20, group: 'besi_baja', priceDefault: 45000 },
      { name: 'Sekrup SDS / Fastener Rangka Atap', unit: 'buah', coef: 20.0, group: 'besi_baja', priceDefault: 350 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.15, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Kayu', unit: 'OH', coef: 0.15, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.015, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.0075, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 13. PENUTUP ATAP GENTENG BETON / METAL (m²)
  {
    matcher: /^(?=.*(pasang|pekerjaan|penutup))(?=.*(genteng|spandek|asbes|atap.*metal)).*$/i,
    category: 'atap',
    label: 'Penutup Atap Genteng / Metal',
    unitMatch: /m[²2]/i,
    materials: [
      { name: 'Genteng Beton Standar', unit: 'buah', coef: 11.0, group: 'dinding_lantai', priceDefault: 7900 },
      { name: 'Paku Seng / Sekrup Genteng', unit: 'kg', coef: 0.08, group: 'besi_baja', priceDefault: 34000 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.15, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Kayu', unit: 'OH', coef: 0.08, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.008, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.0075, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 14. PEMASANGAN KUSEN ALUMINIUM (m')
  {
    matcher: /^(?=.*(pasang|pekerjaan))(?=.*kusen.*alumini).*$/i,
    category: 'kusen_pintu_jendela',
    label: 'Pemasangan Kusen Aluminium',
    unitMatch: /m|m['']/i,
    materials: [
      { name: 'Kusen Aluminium 3 Inch', unit: 'm', coef: 1.05, group: 'finishing_mep', priceDefault: 199880 },
      { name: 'Sekrup & Fischer Kusen', unit: 'buah', coef: 4.0, group: 'finishing_mep', priceDefault: 850 },
      { name: 'Sealant Silikon Kusen', unit: 'tube', coef: 0.08, group: 'finishing_mep', priceDefault: 35000 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.05, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Alumunium', unit: 'OH', coef: 0.05, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.005, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.0025, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 15. TITIK INSTALASI LAMPU (titik)
  {
    matcher: /^(?=.*(titik|instalasi))(?=.*lampu).*$/i,
    category: 'mep',
    label: 'Pekerjaan Instalasi Titik Lampu',
    unitMatch: /titik/i,
    materials: [
      { name: 'Kabel NYM 2x1.5mm²', unit: 'm', coef: 8.0, group: 'finishing_mep', priceDefault: 8900 },
      { name: 'Pipa Conduit PVC 20mm', unit: 'batang', coef: 2.0, group: 'finishing_mep', priceDefault: 12000 },
      { name: 'Inbow Dus / T-Dus Listrik', unit: 'buah', coef: 2.0, group: 'finishing_mep', priceDefault: 4500 },
      { name: 'Fitting E27', unit: 'buah', coef: 1.0, group: 'finishing_mep', priceDefault: 9018 },
      { name: 'Lampu LED E27 10 Watt', unit: 'buah', coef: 1.0, group: 'finishing_mep', priceDefault: 46500 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.10, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Listrik', unit: 'OH', coef: 0.25, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.025, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.008, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 16. TITIK INSTALASI STOP KONTAK (titik)
  {
    matcher: /^(?=.*(titik|instalasi))(?=.*stop.*kontak).*$/i,
    category: 'mep',
    label: 'Pekerjaan Instalasi Titik Stop Kontak',
    unitMatch: /titik/i,
    materials: [
      { name: 'Kabel NYM 3x2.5mm²', unit: 'm', coef: 8.0, group: 'finishing_mep', priceDefault: 18900 },
      { name: 'Pipa Conduit PVC 20mm', unit: 'batang', coef: 2.0, group: 'finishing_mep', priceDefault: 12000 },
      { name: 'Inbow Dus / T-Dus Listrik', unit: 'buah', coef: 1.0, group: 'finishing_mep', priceDefault: 4500 },
      { name: 'Stop Kontak 1P 10A', unit: 'buah', coef: 1.0, group: 'finishing_mep', priceDefault: 13926 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.10, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Listrik', unit: 'OH', coef: 0.25, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.025, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.008, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  },

  // 17. PEMASANGAN PAVING BLOCK (m²)
  {
    matcher: /^(?=.*(pasang|pekerjaan))(?=.*paving).*$/i,
    category: 'lain_lain',
    label: 'Pekerjaan Pemasangan Paving Block',
    unitMatch: /m[²2]/i,
    materials: [
      { name: 'Paving Block Bata Tebal 6cm', unit: 'buah', coef: 44.0, group: 'dinding_lantai', priceDefault: 2200 },
      { name: 'Pasir Pasang / Alas Paving', unit: 'm³', coef: 0.05, group: 'semen_agregat', priceDefault: 384800 }
    ],
    labor: [
      { name: 'Pekerja', unit: 'OH', coef: 0.20, group: 'tenaga_kerja', priceDefault: 145000 },
      { name: 'Tukang Batu', unit: 'OH', coef: 0.10, group: 'tenaga_kerja', priceDefault: 160000 },
      { name: 'Kepala Tukang', unit: 'OH', coef: 0.01, group: 'tenaga_kerja', priceDefault: 170000 },
      { name: 'Mandor', unit: 'OH', coef: 0.01, group: 'tenaga_kerja', priceDefault: 170000 }
    ]
  }
];

/**
 * Ekstraksi peta harga satuan aktif dari BoQ State
 * Menjamin bahwa jika user mengubah harga semen, pasir, atau item bahan lain di RAB detail,
 * dekomposisi SNI otomatis menggunakan harga satuan yang disesuaikan user.
 * PENTING: Hanya mencatat harga BAHAN LANGSUNG (bukan harga pekerjaan gabungan/borongan).
 */
function buildActivePriceMap(boqState) {
  const map = new Map();
  const categories = boqState?.categories || [];
  
  categories.forEach(cat => {
    (cat.items || []).forEach(it => {
      const uStr = typeof it.uraian === 'string' ? it.uraian : (it.uraian?.uraian || String(it.uraian || ''));
      const sat = typeof it.satuan === 'string' ? it.satuan : (it.satuan?.satuan || String(it.satuan || ''));
      const prc = parseFloat(it.harga) || 0;
      if (uStr && prc > 0) {
        // HANYA simpan harga material toko riil atau upah langsung, BUKAN paket pekerjaan komposit
        if (!isCompositeWorkItem(uStr, sat)) {
          map.set(uStr.trim().toLowerCase(), { price: prc, unit: sat.toLowerCase().trim() });
        }
      }
    });
  });
  return map;
}

/**
 * Menyelesaikan harga dinamis untuk material/upah hasil dekomposisi
 */
function resolveDynamicPrice(matName, unit, defaultPrice, activePriceMap) {
  const lower = matName.toLowerCase().trim();
  const uLower = (unit || '').toLowerCase().trim();
  
  // 1. Cek kecocokan langsung
  if (activePriceMap.has(lower)) {
    const entry = activePriceMap.get(lower);
    return entry.price;
  }

  // 2. Cek kecocokan cerdas berdasarkan kata kunci bahan riil
  for (const [key, entry] of activePriceMap.entries()) {
    const { price, unit: kUnit } = entry;

    if (lower.includes('semen portland') && key.includes('semen portland')) {
      // Jika harga di BoQ per Sak (@40kg), konversi ke per Kg jika unit yang diminta 'kg'
      if (uLower === 'kg') {
        return (kUnit === 'sak' || kUnit === 'zak') ? Math.round(price / 40) : price;
      }
      return (kUnit === 'kg') ? price * 40 : price;
    }

    if (lower.includes('pasir pasang') && key.includes('pasir pasang')) return price;
    if (lower.includes('pasir beton') && key.includes('pasir beton')) return price;
    if (lower.includes('pasir urug') && key.includes('pasir urug')) return price;
    if ((lower.includes('batu belah') || lower.includes('batu kali')) && (key.includes('batu belah') || key.includes('batu kali'))) return price;
    if ((lower.includes('split') || lower.includes('kerikil')) && (key.includes('split') || key.includes('kerikil') || key.includes('agregat'))) return price;
    if (lower.includes('bata merah') && key.includes('bata merah') && !key.includes('pasang') && !key.includes('dinding')) return price;
    if (lower.includes('bata ringan') && key.includes('bata ringan') && !key.includes('pasang') && !key.includes('dinding')) return price;
    if (lower.includes('mortar') && key.includes('mortar')) return uLower === 'kg' ? Math.round(price / 40) : price;
    if (lower.includes('gypsum') && (key.includes('gypsum') || key.includes('gipsum')) && !key.includes('pasang')) return price;
    if (lower.includes('hollow') && key.includes('hollow')) return price;
    if (lower.includes('besi') && key.includes('besi beton')) return price;
    
    // Upah tenaga kerja
    if (lower === 'pekerja' && key === 'pekerja') return price;
    if (lower.includes('tukang batu') && key.includes('tukang batu')) return price;
    if (lower.includes('tukang kayu') && key.includes('tukang kayu')) return price;
    if (lower.includes('tukang besi') && key.includes('tukang besi')) return price;
    if (lower.includes('tukang cat') && key.includes('tukang cat')) return price;
    if (lower.includes('tukang listrik') && key.includes('tukang listrik')) return price;
    if (lower.includes('tukang pipa') && key.includes('tukang pipa')) return price;
    if (lower.includes('kepala tukang') && key.includes('kepala tukang')) return price;
    if (lower.includes('mandor') && key.includes('mandor')) return price;
  }

  return defaultPrice;
}

/**
 * Deteksi apakah sebuah item di RAB adalah Tenaga Kerja Langsung (OH)
 * PENTING: Kata "pekerjaan" TIDAK BOLEH dideteksi sebagai pekerja!
 */
export function isDirectLaborItem(uraian, satuan) {
  const satLower = String(satuan || '').toLowerCase().trim();
  const uLower = String(uraian || '').toLowerCase().trim();

  // Jika satuannya OH dan bukan deskripsi pekerjaan luas
  if (satLower === 'oh') return true;

  // Daftar role tenaga kerja baku
  const laborRoles = [
    'pekerja', 'tukang batu', 'tukang kayu', 'tukang besi', 'tukang besi konstruksi',
    'tukang cat', 'tukang las', 'tukang listrik', 'tukang pipa', 'tukang alumunium',
    'tukang pasang keramik', 'tukang tembok', 'tukang vibrator',
    'kepala tukang', 'mandor', 'juru ukur', 'pembantu juru ukur',
    'penjaga malam', 'operator alat berat', 'operator crane', 'supir truk'
  ];

  // Jangan pernah anggap kata "pekerjaan ...", "pasang ...", "cor ...", "instalasi ..." sebagai tenaga kerja!
  if (uLower.includes('pekerjaan') || uLower.includes('pasang') || uLower.includes('cor ') || uLower.includes('instalasi')) {
    return false;
  }

  return laborRoles.some(role => {
    const rx = new RegExp(`^${role}$|^${role}\\s+|\\s+${role}$`, 'i');
    return rx.test(uLower);
  });
}

/**
 * Deteksi apakah sebuah item di RAB merupakan Pekerjaan Komposit / Borongan
 * yang wajib didekomposisi menggunakan koefisien SNI
 */
export function isCompositeWorkItem(uraian, satuan) {
  const uLower = String(uraian || '').toLowerCase().trim();
  const satLower = String(satuan || '').toLowerCase().trim();

  // Bahan baku agregat & pasir yang mengandung kata 'pasang' (mis. Pasir Pasang) adalah material langsung
  if (uLower.startsWith('pasir') || uLower.startsWith('batu belah') || uLower.startsWith('batu kali')) {
    if (!uLower.includes('terpasang lengkap') && !uLower.includes('pekerjaan') && !uLower.includes('pasang batu')) {
      return false;
    }
  }

  // Satuan kemasan toko adalah indikasi kuat BAHAN BELANJA LANGSUNG
  const PACKAGING_UNITS = new Set([
    'sak', 'zak', 'dus', 'box', 'roll', 'rol', 'pail', 'galon',
    'bungkus', 'bks', 'lonjor', 'batang', 'btg', 'buah', 'bh', 'pcs',
    'kaleng', 'tube', 'can', 'lembar', 'lbr', 'rit'
  ]);

  // Jika satuannya adalah kemasan toko dan tidak ada tulisan "terpasang lengkap", jangan didekomposisi
  if (PACKAGING_UNITS.has(satLower) && !uLower.includes('terpasang lengkap')) {
    return false;
  }

  // Kata kunci pekerjaan konstruksi gabungan
  const hasWorkWord = 
    (uLower.includes('pasang') && !uLower.includes('pasir pasang') && !uLower.includes('pasir pasangan')) ||
    uLower.includes('pekerjaan') ||
    uLower.startsWith('pek.') ||
    uLower.includes('pemasangan') ||
    uLower.includes('cor ') ||
    uLower.includes('pengecoran') ||
    uLower.includes('plesteran') ||
    uLower.includes('plester') ||
    uLower.includes('acian') ||
    uLower.includes('terpasang lengkap') ||
    uLower.includes('rabat beton') ||
    uLower.includes('lantai kerja') ||
    uLower.includes('instalasi titik') ||
    uLower.includes('titik instalasi') ||
    uLower.includes('rangka atap');

  return hasWorkWord;
}

/**
 * Mengelompokkan item belanja material langsung (non-komposit) ke dalam kategori logistik
 */
function classifyDirectMaterialGroup(uraian, satuan) {
  const text = (uraian || '').toLowerCase();
  const sat = (satuan || '').toLowerCase();

  // 1. Semen & Agregat
  if (
    text.includes('semen') || text.includes('pasir') || text.includes('batu kali') ||
    text.includes('batu belah') || text.includes('split') || text.includes('kerikil') ||
    text.includes('sirtu') || text.includes('tanah') || text.includes('mortar') ||
    text.includes('agregat') || text.includes('abu batu')
  ) {
    return 'semen_agregat';
  }

  // 2. Besi, Baja & Rangka
  if (
    text.includes('besi') || text.includes('baja') || text.includes('rebar') ||
    text.includes('tulangan') || text.includes('wiremesh') || text.includes('bendrat') ||
    text.includes('paku') || text.includes('baut') || text.includes('sekrup') ||
    text.includes('siku') || text.includes('hollow') || text.includes('kanal') ||
    text.includes('reng') || text.includes('kawat') || text.includes('screw')
  ) {
    return 'besi_baja';
  }

  // 3. Dinding, Lantai, Atap & Plafond
  if (
    text.includes('bata') || text.includes('hebel') || text.includes('batako') ||
    text.includes('rooster') || text.includes('keramik') || text.includes('granit') ||
    text.includes('marmer') || text.includes('ubin') || text.includes('tile') ||
    text.includes('gypsum') || text.includes('gipsum') || text.includes('grc') ||
    text.includes('genteng') || text.includes('spandek') || text.includes('asbes') ||
    text.includes('seng') || text.includes('nok') || text.includes('bubung') ||
    text.includes('parqu') || text.includes('vinyl') || text.includes('decking')
  ) {
    return 'dinding_lantai';
  }

  // 4. Finishing, MEP, Sanitasi & Perlengkapan Toko
  return 'finishing_mep';
}

/**
 * Klasifikasi item material langsung dari RAB detail dengan mempertahankan
 * volume, satuan baku, dan harga satuan yang diinput oleh user.
 */
function classifyDirectItem(uraian, satuan, volume, harga) {
  const vol = parseFloat(volume) || 0;
  const prc = parseFloat(harga) || 0;
  if (vol <= 0) return null;

  const text = (uraian || '').trim();
  const textLower = text.toLowerCase();
  const satLower = (satuan || '').toLowerCase().trim();
  const group = classifyDirectMaterialGroup(textLower, satLower);

  // Normalisasi catatan logistik untuk armada & spesifikasi
  let note = '';
  let extra = null;

  if (textLower.includes('semen portland') || (textLower.includes('semen') && !textLower.includes('nat') && !textLower.includes('warna') && !textLower.includes('mortar'))) {
    if (satLower === 'sak' || satLower === 'zak') {
      note = 'Kemasan Sak @40kg';
    } else if (satLower === 'kg') {
      note = `≈ ${(vol / 40).toFixed(1)} Sak (@40kg)`;
    }
  } else if (textLower.includes('pasir') || textLower.includes('split') || textLower.includes('kerikil') || textLower.includes('batu kali') || textLower.includes('batu belah')) {
    if (satLower === 'm3' || satLower === 'm³') {
      note = `≈ ${(vol / 6.5).toFixed(1)} Rit Dump Truck (~6.5m³)`;
    } else if (satLower === 'rit') {
      note = `Armada Dump Truck (~6.5m³) · Total ≈ ${(vol * 6.5).toFixed(1)} m³`;
    }
  } else if (textLower.includes('besi') || textLower.includes('rebar') || textLower.includes('tulangan')) {
    const dMatch = textLower.match(/[øødD](\d{1,2})/);
    const dia = dMatch ? parseInt(dMatch[1], 10) : null;
    const isLonjor = satLower.includes('lonjor') || satLower.includes('batang') || satLower.includes('btg');

    if (dia && REBAR_WEIGHT_PER_LONJOR[dia]) {
      const wtLonjor = REBAR_WEIGHT_PER_LONJOR[dia];
      if (isLonjor) {
        note = `Besi Ø${dia}mm (12m) · Total ≈ ${(vol * wtLonjor).toFixed(0)} kg`;
        extra = { diameter: dia, kgEstimated: vol * wtLonjor, lonjorEstimated: vol };
      } else {
        const estLonjor = Math.ceil(vol / wtLonjor);
        note = `Besi Ø${dia}mm · Total ≈ ${estLonjor} Lonjor (12m)`;
        extra = { diameter: dia, kgEstimated: vol, lonjorEstimated: estLonjor };
      }
    }
  } else if (satLower === 'dus' || satLower === 'box') {
    note = 'Kemasan Dus Pabrik';
  } else if (satLower === 'pail') {
    note = 'Kemasan Pail Besar (@20-25kg)';
  } else if (satLower === 'galon') {
    note = 'Kemasan Galon (@4-5kg)';
  } else if (satLower === 'roll' || satLower === 'rol') {
    note = 'Kemasan Roll Toko';
  } else if (textLower.includes('lisplang')) {
    note = 'Lisplang Tepian Tritisan (@2.44m)';
  } else if (textLower.includes('talang')) {
    note = 'Saluran Talang Air Hujan Atap';
  } else if (textLower.includes('nok') || textLower.includes('bubung')) {
    note = 'Penutup Nok Bubungan Puncak Atap';
  } else if (textLower.includes('sekrup') || textLower.includes('baut')) {
    note = 'Fastener / Baut Roofing Baja Ringan';
  }

  return {
    name: text,
    unit: satuan || 'unit',
    quantity: vol,
    estimatedCost: vol * prc,
    group,
    extra,
    note
  };
}

/**
 * Master BOM Generator: Menghitung seluruh kebutuhan material & upah dari state BoQ
 * @param {Object} boqState - state BoQ yang berisi categories, project, dsb.
 * @param {Object} options - { cementPackWeight: 40, truckCapacityM3: 6.5 }
 */
export function calculateMaterialTakeoff(boqState, options = {}) {
  const cementPackKg = options.cementPackWeight || 40; // Standar baku tunggal: Sak @40kg
  const truckCapM3 = options.truckCapacityM3 || 6.5;     // default 6.5m3 per colt diesel dump truck

  const aggregated = new Map();       // key = name + unit -> item object
  const laborAggregated = new Map();  // key = role name -> HOK object
  const activePriceMap = buildActivePriceMap(boqState);

  // 1. Telusuri setiap kategori dan item di BoQ yang volumenya > 0
  const categories = boqState?.categories || [];

  categories.forEach(cat => {
    (cat.items || []).forEach(item => {
      const vol = parseFloat(item.volume) || 0;
      const harga = parseFloat(item.harga) || 0;
      const uraianStr = typeof item.uraian === 'string' ? item.uraian : (item.uraian?.uraian || String(item.uraian || ''));
      if (vol <= 0 || !uraianStr || uraianStr.trim() === '') return;

      const uraianTrimmed = uraianStr.trim();
      const satTrimmed = (typeof item.satuan === 'string' ? item.satuan : (item.satuan?.satuan || String(item.satuan || ''))).trim();
      const uraianLower = uraianTrimmed.toLowerCase();
      const satLower = satTrimmed.toLowerCase();

      // =========================================================================
      // JALUR 1: TENAGA KERJA LANGSUNG (OH)
      // =========================================================================
      if (isDirectLaborItem(uraianTrimmed, satTrimmed)) {
        const key = uraianTrimmed;
        const laborCost = vol * (harga > 0 ? harga : 145000);

        if (!laborAggregated.has(key)) {
          laborAggregated.set(key, {
            name: uraianTrimmed,
            unit: 'OH',
            quantity: 0,
            estimatedCost: 0,
            group: 'tenaga_kerja',
            sources: []
          });
        }
        const cur = laborAggregated.get(key);
        cur.quantity += vol;
        cur.estimatedCost += laborCost;
        cur.sources.push(`${uraianTrimmed} (${vol} ${satTrimmed})`);
        return; // Selesai untuk tenaga kerja
      }

      // =========================================================================
      // JALUR 2: PEKERJAAN KOMPOSIT / BORONGAN (DEKOMPOSISI SNI)
      // =========================================================================
      let matchedSni = null;
      if (isCompositeWorkItem(uraianTrimmed, satTrimmed)) {
        for (const sni of SNI_DECOMPOSITIONS) {
          if (sni.matcher.test(uraianLower)) {
            // Jika ada pengecekan unitMatch, pastikan cocok
            if (sni.unitMatch && !sni.unitMatch.test(satLower)) {
              continue;
            }
            matchedSni = sni;
            break;
          }
        }
      }

      if (matchedSni) {
        // A. Dekomposisi bahan belanja material SNI
        matchedSni.materials.forEach(mat => {
          const qty = vol * mat.coef;
          const dynPrice = resolveDynamicPrice(mat.name, mat.unit, mat.priceDefault, activePriceMap);
          const cost = qty * dynPrice;
          const key = `${mat.name}__${mat.unit}`;

          if (!aggregated.has(key)) {
            aggregated.set(key, {
              name: mat.name,
              unit: mat.unit,
              quantity: 0,
              estimatedCost: 0,
              group: mat.group,
              sources: []
            });
          }
          const cur = aggregated.get(key);
          cur.quantity += qty;
          cur.estimatedCost += cost;
          cur.sources.push(`${uraianTrimmed} (${vol} ${satTrimmed})`);
        });

        // B. Dekomposisi alokasi upah tenaga kerja SNI
        matchedSni.labor.forEach(lab => {
          const hok = vol * lab.coef;
          const dynLaborPrice = resolveDynamicPrice(lab.name, 'OH', lab.priceDefault, activePriceMap);
          const cost = hok * dynLaborPrice;
          const key = lab.name;

          if (!laborAggregated.has(key)) {
            laborAggregated.set(key, {
              name: lab.name,
              unit: 'OH',
              quantity: 0,
              estimatedCost: 0,
              group: 'tenaga_kerja',
              sources: []
            });
          }
          const cur = laborAggregated.get(key);
          cur.quantity += hok;
          cur.estimatedCost += cost;
          cur.sources.push(`${uraianTrimmed} (${vol} ${satTrimmed})`);
        });

        return; // Selesai untuk pekerjaan komposit
      }

      // =========================================================================
      // JALUR 3: MATERIAL BELANJA LANGSUNG (BAHAN TOKO / KALKULATOR)
      // =========================================================================
      const direct = classifyDirectItem(uraianTrimmed, satTrimmed, vol, harga);
      if (direct) {
        const key = `${direct.name}__${direct.unit}`;
        if (!aggregated.has(key)) {
          aggregated.set(key, {
            name: direct.name,
            unit: direct.unit,
            quantity: 0,
            estimatedCost: 0,
            group: direct.group,
            extra: direct.extra || null,
            note: direct.note || '',
            sources: []
          });
        }
        const cur = aggregated.get(key);
        cur.quantity += direct.quantity;
        cur.estimatedCost += direct.estimatedCost;
        cur.sources.push(`${uraianTrimmed} (${vol} ${satTrimmed})`);
      }
    });
  });

  // =========================================================================
  // 2. NORMALISASI SEMEN PORTLAND (Satukan kg hasil SNI & sak belanja langsung)
  // =========================================================================
  let totalSemenKg = 0;
  let totalSemenCostFromKg = 0;
  let directSemenSacks = 0;
  let directSemenCostFromSacks = 0;
  const semenSources = [];

  for (const [key, item] of aggregated.entries()) {
    const isPortland = item.name.toLowerCase().includes('semen portland') || (item.name.toLowerCase().startsWith('semen') && !item.name.toLowerCase().includes('nat') && !item.name.toLowerCase().includes('warna') && !item.name.toLowerCase().includes('mortar'));
    
    if (isPortland) {
      const uLower = item.unit.toLowerCase();
      if (uLower === 'kg') {
        totalSemenKg += item.quantity;
        totalSemenCostFromKg += item.estimatedCost;
        semenSources.push(...item.sources);
        aggregated.delete(key);
      } else if (uLower === 'sak' || uLower === 'zak') {
        directSemenSacks += item.quantity;
        directSemenCostFromSacks += item.estimatedCost;
        semenSources.push(...item.sources);
        aggregated.delete(key);
      }
    }
  }

  // Gabungkan semen kg hasil analisa SNI dan semen sak langsung menjadi satuan Baku Sak @40kg
  if (totalSemenKg > 0 || directSemenSacks > 0) {
    const sacksFromKg = totalSemenKg > 0 ? (totalSemenKg / cementPackKg) : 0;
    const totalSacksCombined = directSemenSacks + sacksFromKg;
    const finalSacksInt = Math.ceil(totalSacksCombined);
    const totalSemenCostCombined = directSemenCostFromSacks + totalSemenCostFromKg;
    const totalCombinedKg = (directSemenSacks * cementPackKg) + totalSemenKg;

    aggregated.set('Semen Portland (PC)__sak', {
      name: `Semen Portland (PC) @${cementPackKg}kg`,
      unit: 'sak',
      quantity: finalSacksInt,
      estimatedCost: totalSemenCostCombined,
      group: 'semen_agregat',
      note: `Total ${totalCombinedKg.toFixed(0)} kg (Standar Kemasan Sak @${cementPackKg}kg)`,
      sources: Array.from(new Set(semenSources))
    });
  }

  // =========================================================================
  // 2b. NORMALISASI SEMEN MORTAR THINBED (Satukan kg & sak menjadi Sak @40kg)
  // =========================================================================
  let totalMortarKg = 0;
  let totalMortarCostFromKg = 0;
  let directMortarSacks = 0;
  let directMortarCostFromSacks = 0;
  const mortarSources = [];

  for (const [key, item] of aggregated.entries()) {
    const isMortar = item.name.toLowerCase().includes('mortar') || item.name.toLowerCase().includes('thinbed') || item.name.toLowerCase().includes('perekat hebel');
    if (isMortar) {
      const uLower = item.unit.toLowerCase();
      if (uLower === 'kg') {
        totalMortarKg += item.quantity;
        totalMortarCostFromKg += item.estimatedCost;
        mortarSources.push(...item.sources);
        aggregated.delete(key);
      } else if (uLower === 'sak' || uLower === 'zak') {
        directMortarSacks += item.quantity;
        directMortarCostFromSacks += item.estimatedCost;
        mortarSources.push(...item.sources);
        aggregated.delete(key);
      }
    }
  }

  if (totalMortarKg > 0 || directMortarSacks > 0) {
    const sacksFromKg = totalMortarKg > 0 ? (totalMortarKg / 40) : 0;
    const totalSacksCombined = directMortarSacks + sacksFromKg;
    const finalSacksInt = Math.ceil(totalSacksCombined);
    const totalMortarCostCombined = directMortarCostFromSacks + totalMortarCostFromKg;
    const totalCombinedKg = (directMortarSacks * 40) + totalMortarKg;

    aggregated.set('Mortar Instan Thinbed__sak', {
      name: `Semen Mortar Thinbed / Perekat Hebel @40kg`,
      unit: 'sak',
      quantity: finalSacksInt,
      estimatedCost: totalMortarCostCombined,
      group: 'semen_agregat',
      note: `Total ${totalCombinedKg.toFixed(0)} kg (Standar Kemasan Sak @40kg Toko)`,
      sources: Array.from(new Set(mortarSources))
    });
  }

  // =========================================================================
  // 3. REKAPITULASI BESI TULANGAN: Hitung total Kg & Lonjor
  // =========================================================================
  let totalRebarKg = 0;
  let totalRebarLonjor = 0;

  for (const [key, item] of aggregated.entries()) {
    if (item.group === 'besi_baja') {
      if (item.extra) {
        if (item.extra.kgEstimated) totalRebarKg += item.extra.kgEstimated;
        if (item.extra.lonjorEstimated) totalRebarLonjor += item.extra.lonjorEstimated;
      } else if (item.unit.toLowerCase() === 'kg' && item.name.toLowerCase().includes('besi')) {
        totalRebarKg += item.quantity;
        totalRebarLonjor += item.quantity / 10; // perkiraan rata-rata ~10kg/lonjor jika tanpa diameter
      } else if ((item.unit.toLowerCase() === 'lonjor' || item.unit.toLowerCase() === 'batang') && item.name.toLowerCase().includes('besi')) {
        totalRebarLonjor += item.quantity;
        totalRebarKg += item.quantity * 10;
      }
    }
  }

  // =========================================================================
  // 4. HITUNG RITASE TRUK PASIR & AGREGAT KASAR
  // =========================================================================
  let totalPasirM3 = 0;
  let totalSplitM3 = 0;
  let totalBatuKaliM3 = 0;

  for (const [key, item] of aggregated.entries()) {
    const nameLower = item.name.toLowerCase();
    const uLower = item.unit.toLowerCase();
    const m3Val = uLower === 'rit' ? item.quantity * truckCapM3 : (uLower === 'm³' || uLower === 'm3' ? item.quantity : 0);

    if (nameLower.includes('pasir')) totalPasirM3 += m3Val;
    if (nameLower.includes('split') || nameLower.includes('kerikil')) totalSplitM3 += m3Val;
    if (nameLower.includes('batu belah') || nameLower.includes('batu kali')) totalBatuKaliM3 += m3Val;
  }

  // =========================================================================
  // 5. OUTPUT AKHIR (MATERIALS & LABOR) DENGAN STANDAR SATUAN TOKO
  // =========================================================================
  const materialsList = Array.from(aggregated.values()).map(item => {
    const isWholeUnit = ['buah', 'sak', 'pcs', 'dus', 'batang', 'lonjor', 'pail', 'galon', 'roll', 'bungkus', 'lembar', 'box', 'set', 'unit', 'rit'].includes(item.unit?.toLowerCase());
    const cleanQty = isWholeUnit ? (item.quantity % 1 === 0 ? item.quantity : Math.round(item.quantity * 10) / 10) : Math.round(item.quantity * 100) / 100;
    
    // Perkaya catatan kemasan standar toko retail bangunan
    let enrichedNote = item.note || '';
    const nameLower = item.name.toLowerCase();
    const uLower = (item.unit || '').toLowerCase();

    // 1. Besi tulangan jika masih kg -> berikan estimasi lonjor standar toko (12m)
    if (item.group === 'besi_baja' && uLower === 'kg' && nameLower.includes('besi')) {
      const estLonjor = Math.ceil(cleanQty / 10);
      if (!enrichedNote.includes('Lonjor')) {
        enrichedNote = enrichedNote ? `${enrichedNote} · Total ≈ ${estLonjor} Lonjor (12m)` : `Total ≈ ${estLonjor} Lonjor (Standar Toko 12m)`;
      }
    }

    // 2. Pasir & Agregat jika m3 -> berikan estimasi ritase dump truck
    if ((uLower === 'm³' || uLower === 'm3') && (nameLower.includes('pasir') || nameLower.includes('split') || nameLower.includes('kerikil') || nameLower.includes('batu kali') || nameLower.includes('batu belah'))) {
      const rits = (cleanQty / truckCapM3).toFixed(1);
      if (!enrichedNote.includes('Rit')) {
        enrichedNote = enrichedNote ? `${enrichedNote} · ≈ ${rits} Rit Dump Truck` : `≈ ${rits} Rit Dump Truck (~${truckCapM3}m³)`;
      }
    }

    // 3. Cat jika kg/liter -> konversikan ke Pail (@20kg) & Galon (@5kg)
    if ((uLower === 'kg' || uLower === 'liter') && (nameLower.includes('cat') || nameLower.includes('plamir'))) {
      const pails = Math.floor(cleanQty / 20);
      const remKg = cleanQty % 20;
      const galons = Math.ceil(remKg / 5);
      let packNote = '';
      if (pails > 0 && galons > 0) {
        packNote = `≈ ${pails} Pail (@20kg) + ${galons} Galon (@5kg)`;
      } else if (pails > 0) {
        packNote = `≈ ${pails} Pail (@20kg)`;
      } else {
        packNote = `≈ ${galons || 1} Galon (@5kg)`;
      }
      if (!enrichedNote.includes('Pail') && !enrichedNote.includes('Galon')) {
        enrichedNote = enrichedNote ? `${enrichedNote} · ${packNote}` : `${packNote} (Standar Kemasan Pabrik Toko)`;
      }
    }

    // 4. Keramik / Granit jika m2 -> berikan estimasi Dus
    if ((uLower === 'm²' || uLower === 'm2') && (nameLower.includes('keramik') || nameLower.includes('granit') || nameLower.includes('ubin'))) {
      const dus = Math.ceil(cleanQty);
      if (!enrichedNote.includes('Dus')) {
        enrichedNote = enrichedNote ? `${enrichedNote} · ≈ ${dus} Dus` : `≈ ${dus} Dus / Box (@1.0m²) (Standar Kemasan Dus Toko)`;
      }
    }

    // 5. Kabel jika meter -> berikan estimasi Roll (@50m)
    if ((uLower === 'm' || uLower === "m'") && nameLower.includes('kabel')) {
      const rolls = Math.ceil(cleanQty / 50);
      if (!enrichedNote.includes('Roll')) {
        enrichedNote = enrichedNote ? `${enrichedNote} · ≈ ${rolls} Roll` : `≈ ${rolls} Roll (@50m) (Standar Gulungan Toko Listrik)`;
      }
    }

    // 6. Kusen aluminium jika meter -> berikan estimasi Batang (6m)
    if ((uLower === 'm' || uLower === "m'") && nameLower.includes('kusen')) {
      const btgs = Math.ceil(cleanQty / 6);
      if (!enrichedNote.includes('Batang')) {
        enrichedNote = enrichedNote ? `${enrichedNote} · ≈ ${btgs} Batang` : `≈ ${btgs} Batang (Standar Toko 6.00m)`;
      }
    }

    // 7. Pipa jika meter -> berikan estimasi Batang (4m)
    if ((uLower === 'm' || uLower === "m'") && nameLower.includes('pipa')) {
      const btgs = Math.ceil(cleanQty / 4);
      if (!enrichedNote.includes('Batang')) {
        enrichedNote = enrichedNote ? `${enrichedNote} · ≈ ${btgs} Batang` : `≈ ${btgs} Batang (Standar Toko 4.00m)`;
      }
    }

    return {
      ...item,
      quantity: cleanQty,
      estimatedCost: Math.round(item.estimatedCost),
      note: enrichedNote
    };
  });

  const laborList = Array.from(laborAggregated.values()).map(item => ({
    ...item,
    quantity: Math.round(item.quantity * 10) / 10,
    estimatedCost: Math.round(item.estimatedCost)
  }));

  const totalMaterialCost = (materialsList || []).reduce((s, it) => s + (Number(it?.estimatedCost) || 0), 0);
  const totalLaborCost = (laborList || []).reduce((s, it) => s + (Number(it?.estimatedCost) || 0), 0);
  const totalLaborHok = Math.round((laborList || []).reduce((s, it) => s + (Number(it?.quantity) || 0), 0) * 10) / 10;
  const grandCombinedCost = totalMaterialCost + totalLaborCost;

  return {
    materials: materialsList,
    labor: laborList,
    summary: {
      totalItemsCount: materialsList.length,
      totalLaborRolesCount: laborList.length,
      totalMaterialCost,
      totalLaborCost,
      totalLaborHok,
      grandCombinedCost,
      materialRatio: grandCombinedCost > 0 ? (totalMaterialCost / grandCombinedCost) * 100 : 70,
      laborRatio: grandCombinedCost > 0 ? (totalLaborCost / grandCombinedCost) * 100 : 30,
      // Logistik Khusus
      totalSemenKg: Math.round((directSemenSacks * cementPackKg) + totalSemenKg),
      semenSack40kg: Math.ceil((directSemenSacks * cementPackKg + totalSemenKg) / cementPackKg),
      totalPasirM3: Math.round(totalPasirM3 * 100) / 100,
      totalSplitM3: Math.round(totalSplitM3 * 100) / 100,
      totalBatuKaliM3: Math.round(totalBatuKaliM3 * 100) / 100,
      truckPasirRits: Math.ceil(totalPasirM3 / truckCapM3),
      truckSplitRits: Math.ceil(totalSplitM3 / truckCapM3),
      truckBatuKaliRits: Math.ceil(totalBatuKaliM3 / truckCapM3),
      totalRebarKg: Math.round(totalRebarKg),
      totalRebarLonjor: Math.ceil(totalRebarLonjor)
    }
  };
}
