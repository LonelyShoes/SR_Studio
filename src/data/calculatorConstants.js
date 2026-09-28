// Constants and reference standards for auxiliary calculators (SNI and AHSP standard)

export const CONCRETE_MIX = {
  K225: { fc: "18.7 MPa", semen: 371, pasir: 698, kerikil: 1047, air: 215 },
  K250: { fc: "21.0 MPa", semen: 384, pasir: 692, kerikil: 1039, air: 215 },
  K275: { fc: "22.9 MPa", semen: 397, pasir: 688, kerikil: 1031, air: 215 },
  K300: { fc: "24.9 MPa", semen: 413, pasir: 681, kerikil: 1021, air: 215 },
};

export const DENSITIES = {
  PASIR: 1400,    // kg/m3
  KERIKIL: 1350,  // kg/m3
  NAT: 1600,      // kg/m3
  BAJA: 7850,     // kg/m3
  ZAK_SEMEN: 40   // kg per zak
};

export const TILE_DATA = {
  interior: {
    label: "Keramik Lantai Interior",
    sizes: {
      "30x30": { p: 0.30, l: 0.30, pcsPerDus: 11, mortar: 4.0, natWidth: 2, natDepth: 8 },
      "40x40": { p: 0.40, l: 0.40, pcsPerDus: 6, mortar: 4.5, natWidth: 2, natDepth: 8 },
      "50x50": { p: 0.50, l: 0.50, pcsPerDus: 4, mortar: 5.0, natWidth: 2, natDepth: 8 },
      "60x60": { p: 0.60, l: 0.60, pcsPerDus: 3, mortar: 5.5, natWidth: 2, natDepth: 8 },
    }
  },
  dinding: {
    label: "Keramik Dinding & Kamar Mandi",
    sizes: {
      "20x20": { p: 0.20, l: 0.20, pcsPerDus: 25, mortar: 3.5, natWidth: 2, natDepth: 7 },
      "20x25": { p: 0.20, l: 0.25, pcsPerDus: 20, mortar: 3.6, natWidth: 2, natDepth: 7 },
      "20x40": { p: 0.20, l: 0.40, pcsPerDus: 10, mortar: 3.8, natWidth: 2, natDepth: 7 },
      "25x50": { p: 0.25, l: 0.50, pcsPerDus: 8, mortar: 4.2, natWidth: 2, natDepth: 7 },
      "30x60": { p: 0.30, l: 0.60, pcsPerDus: 6, mortar: 4.5, natWidth: 2, natDepth: 7 },
    }
  },
  woodplank: {
    label: "Keramik Motif Kayu (Wood Plank)",
    sizes: {
      "15x60": { p: 0.15, l: 0.60, pcsPerDus: 10, mortar: 4.0, natWidth: 2, natDepth: 8 },
      "15x80": { p: 0.15, l: 0.80, pcsPerDus: 8, mortar: 4.5, natWidth: 2, natDepth: 8 },
      "15x90": { p: 0.15, l: 0.90, pcsPerDus: 7, mortar: 4.6, natWidth: 2, natDepth: 8 },
      "20x100": { p: 0.20, l: 1.00, pcsPerDus: 5, mortar: 5.0, natWidth: 2, natDepth: 8 },
    }
  },
  format_besar: {
    label: "Format Besar (Granit / Homogeneous Tile)",
    sizes: {
      "80x80": { p: 0.80, l: 0.80, pcsPerDus: 2, mortar: 6.5, natWidth: 1.5, natDepth: 10 },
      "60x120": { p: 0.60, l: 1.20, pcsPerDus: 2, mortar: 7.5, natWidth: 1.5, natDepth: 10 },
      "100x100": { p: 1.00, l: 1.00, pcsPerDus: 1, mortar: 8.0, natWidth: 1.5, natDepth: 10 },
    }
  }
};

export const FLOOR_BASE_MIX = {
  SEMEN_PER_M2: 10,      // kg/m2 (adukan dasar 1PC : 5PP)
  PASIR_M3_PER_M2: 0.045 // m3/m2
};

export const WALL_DEFAULTS = {
  bataMerahJumlah: 70,
  bataMerahSemenSpesi: 9.68,
  bataMerahPasirSpesi: 0.045,
  bataRinganVolume: 0.10,
  bataRinganJumlah: 8.33,
  bataRinganMortar: 4,
  plesterSemen: 6.24,
  plesterPasir: 0.026,
  acianSemen: 3.25,
  catDayaSebar: 10,
  catLapis: 2,
  catKgPerLiter: 1.3,
  sakKg: 40
};
