import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ITEM_DATABASE } from '../data/itemDatabase';
import { parseNum } from '../utils/formatters';
import { calcTotals, getDefaultCategorySchedules, normalizeState, normalizeLibraryProject, normalizeLibrary } from '../utils/normalize';
import { 
  getCloudConfig, 
  saveCloudConfig, 
  uploadLibraryToCloud, 
  fetchLibraryFromCloud,
  getFirebaseConfig,
  saveFirebaseConfig,
  testFirebaseConnection,
  mergeLibraries,
  getDeletedProjectIds,
  addDeletedProjectId,
  logoutMasterDevice
} from '../services/cloudLibraryService';

import { DEFAULT_LIBRARY_PROJECTS } from '../data/defaultLibrary';
import { CalculatorScopeProvider, copyCalculatorScope, clearCalculatorScope } from '../hooks/usePersistentCalculatorState';

const BoQContext = createContext();

const STORAGE_KEY = 'sr_studio_boq_state_v2';
const LIBRARY_STORAGE_KEY = 'sr_studio_rab_library_v2';
const ACTIVE_ROLE_KEY = 'sr_studio_active_role_v2';
const SCHEDULE_STORAGE_KEY = 'sr_boq_schedule_config_v2';
const ACTIVE_LIBRARY_ID_KEY = 'sr_studio_active_library_id_v2';

// NOTE: getDefaultCategorySchedules / normalize* sumbernya di utils/normalize.js.
// BoQContext hanya me-re-export agar import lama tidak rusak.
export { getDefaultCategorySchedules, normalizeState, normalizeLibraryProject, normalizeLibrary };

function getInitialLibrary() {
  try {
    const saved = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return normalizeLibrary(parsed);
    }
  } catch (e) {
    console.error("Failed to load library from localStorage:", e);
  }
  return normalizeLibrary(DEFAULT_LIBRARY_PROJECTS);
}

function getInitialActiveLibraryId() {
  try {
    return localStorage.getItem(ACTIVE_LIBRARY_ID_KEY) || null;
  } catch (e) {
    return null;
  }
}

function getInitialSchedule() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.durationWeeks) return parsed;
    }
  } catch (e) {
    console.error("Failed to load schedule config:", e);
  }
  return {
    durationWeeks: 12,
    startDate: today,
    categorySchedules: getDefaultCategorySchedules(12),
    actualProgress: {},
  };
}

function getInitialRole() {
  try {
    const role = localStorage.getItem(ACTIVE_ROLE_KEY);
    if (role === 'master' || role === 'client') return role;
  } catch (e) {
    console.error("Failed to load active role:", e);
  }
  return null;
}

function getInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.categories || parsed.project)) {
        return normalizeState(parsed);
      }
    }
  } catch (e) {
    console.error("Failed to load saved state from localStorage:", e);
  }

  return normalizeState(null);
}

export function BoQProvider({ children }) {
  const [state, setState] = useState(getInitialState);
  const [library, setLibrary] = useState(getInitialLibrary);
  const [activeLibraryId, setActiveLibraryId] = useState(getInitialActiveLibraryId);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [materialTakeoffModalOpen, setMaterialTakeoffModalOpen] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState(getInitialSchedule);
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [unlockedTabs, setUnlockedTabs] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [modalPendingData, setModalPendingData] = useState(null); // { isOpen, items, resetFn }
  const [toastMessage, setToastMessage] = useState(null); // { type, text }

  const [sessionRole, setSessionRole] = useState(getInitialRole);
  const [cloudConfig, setCloudConfig] = useState(() => {
    const cfg = getCloudConfig();
    const role = getInitialRole();
    if (role === 'client') {
      return { ...cfg, isMasterDevice: false };
    } else if (role === 'master') {
      return { ...cfg, isMasterDevice: true };
    }
    return cfg;
  });
  const [firebaseConfig, setFirebaseConfig] = useState(getFirebaseConfig);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [isOtpAuthorized, setIsOtpAuthorized] = useState(false);
  const [otpModalData, setOtpModalData] = useState({ isOpen: false, onSuccess: null, actionName: '' });

  const CLIENT_FREE_TABS = ['dashboard', 'schedule', 'library'];

  const isTabLockedForClient = useCallback((tabId) => {
    if (sessionRole === 'master' || cloudConfig.isMasterDevice) return false;
    if (CLIENT_FREE_TABS.includes(tabId)) return false;
    return !unlockedTabs.includes(tabId);
  }, [sessionRole, cloudConfig.isMasterDevice, unlockedTabs]);

  const selectSessionRole = (role) => {
    setSessionRole(role);
    try {
      if (typeof localStorage !== 'undefined') {
        if (role) {
          localStorage.setItem(ACTIVE_ROLE_KEY, role);
        } else {
          localStorage.removeItem(ACTIVE_ROLE_KEY);
        }
      }
    } catch (e) {}

    const isMaster = role === 'master';
    const updated = saveCloudConfig({ isMasterDevice: isMaster });
    setCloudConfig(updated);
    if (role === 'client') {
      setUnlockedTabs([]);
    }
  };

  const logoutToLandingPage = () => {
    setSessionRole(null);
    setUnlockedTabs([]);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(ACTIVE_ROLE_KEY);
      }
    } catch (e) {}
    const updated = logoutMasterDevice();
    setCloudConfig(updated);
    showToast('Anda telah keluar ke Portal Utama.', 'info');
  };

  // Auto-save active state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setLastSaved(new Date());
    } catch (e) {
      console.error("Failed to autosave state:", e);
    }
  }, [state]);

  // Auto-save library to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
    } catch (e) {
      console.error("Failed to save library:", e);
    }
  }, [library]);

  // Auto-save activeLibraryId to localStorage
  useEffect(() => {
    try {
      if (activeLibraryId) {
        localStorage.setItem(ACTIVE_LIBRARY_ID_KEY, activeLibraryId);
      } else {
        localStorage.removeItem(ACTIVE_LIBRARY_ID_KEY);
      }
    } catch (e) {
      console.error("Failed to save activeLibraryId:", e);
    }
  }, [activeLibraryId]);

  // Auto-save schedule to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(scheduleConfig));
    } catch (e) {
      console.error("Failed to save schedule config:", e);
    }
  }, [scheduleConfig]);

  const updateScheduleDuration = (weeks) => {
    const num = Math.max(2, Math.min(52, parseInt(weeks) || 12));
    setScheduleConfig(prev => ({
      ...prev,
      durationWeeks: num,
      categorySchedules: getDefaultCategorySchedules(num, state.categories)
    }));
    showToast(`Durasi jadwal diatur ke ${num} Minggu`, 'info');
  };

  const updateScheduleStartDate = (startDate) => {
    setScheduleConfig(prev => ({ ...prev, startDate }));
  };

  const updateCategorySchedule = (catId, startWeek, endWeek) => {
    setScheduleConfig(prev => {
      const sw = Math.max(1, Math.min(prev.durationWeeks, parseInt(startWeek) || 1));
      const ew = Math.max(sw, Math.min(prev.durationWeeks, parseInt(endWeek) || 1));
      return {
        ...prev,
        categorySchedules: {
          ...prev.categorySchedules,
          [catId]: { startWeek: sw, endWeek: ew }
        }
      };
    });
  };

  const updateActualProgress = (weekIdx, value) => {
    setScheduleConfig(prev => ({
      ...prev,
      actualProgress: {
        ...prev.actualProgress,
        [weekIdx]: Math.max(0, Math.min(100, parseFloat(value) || 0))
      }
    }));
  };

  const resetScheduleToDefault = () => {
    setScheduleConfig(prev => ({
      ...prev,
      categorySchedules: getDefaultCategorySchedules(prev.durationWeeks, state.categories),
      actualProgress: {}
    }));
    showToast('Jadwal & Kurva S di-reset ke rekomendasi urutan standar konstruksi.', 'info');
  };

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Cloud Sync Logic
  const updateCloudSettings = (newConfig) => {
    const saved = saveCloudConfig(newConfig);
    setCloudConfig(saved);
  };

  const updateFirebaseSettings = (newConfig) => {
    const saved = saveFirebaseConfig(newConfig);
    setFirebaseConfig(saved);
  };

  const syncCloudLibrary = useCallback(async (forcePush = false) => {
    setIsCloudSyncing(true);
    try {
      // 1. Ambil data terbaru dari cloud
      const result = await fetchLibraryFromCloud({ firebase: firebaseConfig });
      const remoteLib = result.success && Array.isArray(result.library) ? result.library : [];
      const remoteDeleted = result.deletedIds || getDeletedProjectIds();

      // 2. Smart merge library lokal dengan library cloud & deletedIds
      const merged = mergeLibraries(library, remoteLib, remoteDeleted);
      setLibrary(merged);

      // 3. Unggah kembali library hasil merge ke Cloud
      const uploadRes = await uploadLibraryToCloud(merged, { 
        firebase: firebaseConfig, 
        isMasterDevice: cloudConfig.isMasterDevice,
        overwrite: cloudConfig.isMasterDevice && forcePush
      });

      if (uploadRes && uploadRes.library && Array.isArray(uploadRes.library)) {
        setLibrary(uploadRes.library);
      }

      if (cloudConfig.isMasterDevice) {
        showToast(`Library Master berhasil disinkronkan ke Cloud (${merged.length} proyek)!`, 'success');
      } else {
        showToast(`Sinkronisasi berhasil! ${merged.length} proyek tersinkron dengan Cloud.`, 'success');
      }
    } catch (err) {
      console.error('Sync error:', err);
      showToast('Gagal sinkronisasi cloud: ' + err.message, 'error');
    } finally {
      setIsCloudSyncing(false);
    }
  }, [cloudConfig.isMasterDevice, firebaseConfig, library]);

  // URL Hash Sync listener (misal scan QR dari PC Master)
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#sync=')) {
        const jsonStr = decodeURIComponent(hash.replace('#sync=', ''));
        const parsed = JSON.parse(jsonStr);
        if (parsed.library && Array.isArray(parsed.library)) {
          setLibrary(parsed.library);
          if (parsed.firebase && parsed.firebase.dbUrl) {
            updateFirebaseSettings(parsed.firebase);
          }
          showToast(`Berhasil mengimpor ${parsed.library.length} proyek & konfigurasi Firebase via QR Sync!`, 'success');
          window.history.replaceState(null, '', window.location.pathname);
          setActiveTab('library');
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          setLibrary(parsed);
          showToast(`Berhasil mengimpor ${parsed.length} proyek dari QR Sync!`, 'success');
          window.history.replaceState(null, '', window.location.pathname);
          setActiveTab('library');
        }
      }
    } catch (e) {
      console.error('Failed to parse URL sync hash:', e);
    }
  }, []);

  // Auto sync on initial load
  useEffect(() => {
    fetchLibraryFromCloud({ firebase: firebaseConfig }).then(result => {
      if (result.success && Array.isArray(result.library)) {
        const deleted = result.deletedIds || getDeletedProjectIds();
        setLibrary(prevLib => {
          const merged = mergeLibraries(prevLib, result.library, deleted);
          if (cloudConfig.isMasterDevice) {
            uploadLibraryToCloud(merged, { firebase: firebaseConfig, isMasterDevice: true }).catch(console.error);
          }
          return merged;
        });
      }
    }).catch(console.error);
  }, []);

  // Auto fetch from cloud when client device switches to Library tab
  useEffect(() => {
    if (activeTab === 'library') {
      fetchLibraryFromCloud({ firebase: firebaseConfig }).then(result => {
        if (result.success && Array.isArray(result.library)) {
          const deleted = result.deletedIds || getDeletedProjectIds();
          setLibrary(prevLib => mergeLibraries(prevLib, result.library, deleted));
        }
      }).catch(console.error);
    }
  }, [activeTab, firebaseConfig]);

  // Request OTP if device is client (Single-use OTP required for each save action or protected tab access)
  const requireAuthorization = (actionCallback, actionName = 'menyimpan') => {
    // If this is PC Utama (Master Device), allow immediate execution
    if (cloudConfig.isMasterDevice || sessionRole === 'master') {
      actionCallback();
      return;
    }

    // Perangkat Klien wajib memasukkan Kode OTP 1x pakai
    setOtpModalData({
      isOpen: true,
      onSuccess: actionCallback,
      actionName
    });
  };

  const closeOtpModal = () => {
    setOtpModalData({ isOpen: false, onSuccess: null, actionName: '' });
  };

  const setActiveTab = (tabId) => {
    // If master, always allow
    if (sessionRole === 'master' || cloudConfig.isMasterDevice) {
      setActiveTabState(tabId);
      return;
    }

    // If client, check if tab is free
    if (CLIENT_FREE_TABS.includes(tabId)) {
      setActiveTabState(tabId);
      return;
    }

    // If client has already unlocked this tab via OTP in this session
    if (unlockedTabs.includes(tabId)) {
      setActiveTabState(tabId);
      return;
    }

    // Require OTP from Master
    const tabLabels = {
      boq: 'BoQ (Rencana Anggaran Biaya)',
      concrete: 'Kalkulator Beton',
      rebar: 'Kalkulator Pembesian (BBS)',
      floor: 'Kalkulator Lantai & Keramik',
      wall: 'Kalkulator Pasangan Dinding & Plesteran',
      plafond: 'Kalkulator Plafond & Rangka',
      mep: 'Kalkulator MEP',
      sanitasi: 'Kalkulator Sanitasi & Plumbing',
      foundation: 'Kalkulator Pondasi & Galian',
      roof: 'Kalkulator Atap & Baja Ringan',
      doors: 'Kalkulator Kusen, Pintu & Jendela',
      infrastructure: 'Kalkulator Infrastruktur & Kawasan'
    };
    const featureLabel = tabLabels[tabId] || 'fitur ini';

    requireAuthorization(() => {
      setUnlockedTabs(prev => Array.from(new Set([...prev, tabId])));
      setActiveTabState(tabId);
      showToast(`Izin OTP Berhasil! Fitur ${featureLabel} sekarang terbuka.`, 'success');
    }, `mengakses ${featureLabel}`);
  };

  // Project Fields
  const updateProjectField = (field, val) => {
    setState(prev => ({
      ...prev,
      project: { ...prev.project, [field]: val }
    }));
  };

  const updateClusterUnits = (units) => {
    const val = Math.max(1, Math.min(500, parseInt(units) || 1));
    updateProjectField('clusterUnits', val);
  };

  const updateClusterTypology = (typology) => {
    const val = typology === 'shared' ? 'shared' : 'double';
    updateProjectField('clusterTypology', val);
  };

  const updateClusterRowUnits = (units) => {
    const val = Math.max(2, Math.min(50, parseInt(units) || 2));
    updateProjectField('clusterRowUnits', val);
  };

  const togglePpn = () => {
    setState(prev => ({ ...prev, ppn: !prev.ppn }));
  };

  // Category Actions
  const toggleCategoryExpand = (catId) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => 
        c.id === catId ? { ...c, expanded: !c.expanded } : c
      )
    }));
  };

  const expandAllCategories = (expand = true) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => ({ ...c, expanded: expand }))
    }));
  };

  const updateCategoryName = (catId, newName) => {
    if (!cloudConfig.isMasterDevice) {
      const targetCat = state.categories.find(c => c.id === catId);
      if (targetCat && !targetCat.custom) {
        showToast("⛔ Nama kategori standar tidak dapat diubah pada Mode Klien.", "info");
        return;
      }
    }
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => 
        c.id === catId ? { ...c, name: newName } : c
      )
    }));
  };

  const addCustomCategory = (name) => {
    if (!name || !name.trim()) return;
    const newCat = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      custom: true,
      expanded: true,
      items: []
    };
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCat]
    }));
  };

  const deleteCategory = (catId) => {
    if (!cloudConfig.isMasterDevice) {
      const targetCat = state.categories.find(c => c.id === catId);
      if (targetCat && !targetCat.custom) {
        showToast("⛔ Kategori standar tidak dapat dihapus pada Mode Klien.", "error");
        return;
      }
    }
    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== catId)
    }));
  };

  // Item Actions
  const addCustomItem = (catId, uraianOrObj, satuan, harga, volume = 0) => {
    let finalUraian = '';
    let finalSatuan = 'ls';
    let finalHarga = 0;
    let finalVolume = 0;
    let finalSource = 'Custom Manual';
    let finalCode = 'CUST';

    if (typeof uraianOrObj === 'object' && uraianOrObj !== null) {
      finalUraian = String(uraianOrObj.uraian || uraianOrObj.label || '').trim();
      finalSatuan = String(uraianOrObj.satuan || 'ls').trim();
      finalHarga = parseNum(uraianOrObj.harga ?? uraianOrObj.hargaDefault ?? 0);
      finalVolume = parseNum(uraianOrObj.volume ?? uraianOrObj.jumlah ?? 0);
      if (uraianOrObj.source) finalSource = uraianOrObj.source;
      if (uraianOrObj.code) finalCode = uraianOrObj.code;
    } else {
      finalUraian = String(uraianOrObj || '').trim();
      finalSatuan = String(satuan || 'ls').trim();
      finalHarga = parseNum(harga ?? 0);
      finalVolume = parseNum(volume ?? 0);
    }

    if (!finalUraian) return;

    const newItem = {
      code: finalCode,
      uraian: finalUraian,
      satuan: finalSatuan,
      hargaDefault: finalHarga,
      harga: finalHarga,
      source: finalSource,
      volume: finalVolume,
      custom: true,
      key: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    };

    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => 
        c.id === catId 
          ? { ...c, items: [...c.items, newItem] }
          : c
      )
    }));
  };

  // Otomatis menerapkan alokasi HOK Tenaga Kerja ke BoQ
  const applyLaborTakeoff = (laborItems, targetCategoryId = 'upah_tenaga') => {
    if (!Array.isArray(laborItems) || laborItems.length === 0) return 0;

    setState(prev => {
      let categories = [...prev.categories];
      
      // Cek apakah kategori upah_tenaga sudah ada
      let targetCatIndex = categories.findIndex(c => c.id === targetCategoryId);
      if (targetCatIndex === -1) {
        // Buat kategori baru untuk upah tenaga kerja
        const newLaborCategory = {
          id: targetCategoryId,
          name: 'Upah & Tenaga Kerja (HOK SNI)',
          expanded: true,
          items: []
        };
        categories = [...categories, newLaborCategory];
        targetCatIndex = categories.length - 1;
      }

      const targetCat = { ...categories[targetCatIndex] };
      const currentItems = [...targetCat.items];

      laborItems.forEach(lab => {
        const hokQty = Math.round((parseFloat(lab.quantity) || 0) * 100) / 100;
        const laborPrice = parseFloat(lab.priceDefault || lab.harga || 145000);
        if (hokQty <= 0) return;

        // Cari apakah item dengan nama yang sama sudah ada di kategori
        const existingIdx = currentItems.findIndex(it => 
          it.uraian.toLowerCase().trim() === lab.name.toLowerCase().trim()
        );

        if (existingIdx >= 0) {
          // Update volume & harga
          currentItems[existingIdx] = {
            ...currentItems[existingIdx],
            volume: hokQty,
            harga: laborPrice > 0 ? laborPrice : currentItems[existingIdx].harga,
            source: 'HOK Otomatis SNI'
          };
        } else {
          // Tambah item baru
          currentItems.push({
            code: 'HOK',
            uraian: lab.name,
            satuan: 'OH',
            hargaDefault: laborPrice,
            harga: laborPrice,
            source: 'HOK Otomatis SNI',
            volume: hokQty,
            custom: true,
            key: `hok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          });
        }
      });

      targetCat.items = currentItems;
      targetCat.expanded = true;
      categories[targetCatIndex] = targetCat;

      return {
        ...prev,
        categories
      };
    });

    return laborItems.length;
  };

  const updateItemVolume = (catId, itemKey, val) => {
    const num = Math.max(0, parseNum(val));
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => 
        c.id === catId 
          ? {
              ...c,
              items: c.items.map(it => it.key === itemKey ? { ...it, volume: num } : it)
            }
          : c
      )
    }));
  };

  const updateItemPrice = (catId, itemKey, val) => {
    if (!cloudConfig.isMasterDevice) {
      const targetCat = state.categories.find(c => c.id === catId);
      const targetItem = targetCat?.items?.find(it => it.key === itemKey);
      if (targetItem && !targetItem.custom) {
        showToast("⛔ Harga satuan standar hanya dapat diubah oleh Master Studio.", "error");
        return;
      }
    }
    const num = Math.max(0, parseNum(val));
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => 
        c.id === catId 
          ? {
              ...c,
              items: c.items.map(it => it.key === itemKey ? { ...it, harga: num } : it)
            }
          : c
      )
    }));
  };

  const updateCustomItem = (catId, itemKey, uraianOrObj, maybeSatuan, maybeHarga) => {
    let newUraian = undefined;
    let newSatuan = undefined;
    let newHarga = undefined;

    if (uraianOrObj !== null && typeof uraianOrObj === 'object') {
      newUraian = uraianOrObj.uraian;
      newSatuan = uraianOrObj.satuan;
      newHarga = uraianOrObj.harga;
    } else {
      newUraian = uraianOrObj;
      newSatuan = maybeSatuan;
      newHarga = maybeHarga;
    }

    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => 
        c.id === catId 
          ? {
              ...c,
              items: c.items.map(it => {
                if (it.key !== itemKey) return it;
                
                let finalUraian = it.uraian;
                if (newUraian !== undefined) {
                  finalUraian = (typeof newUraian === 'object' && newUraian !== null)
                    ? (newUraian.uraian || '')
                    : String(newUraian ?? '');
                }

                let finalSatuan = it.satuan;
                if (newSatuan !== undefined) {
                  finalSatuan = (typeof newSatuan === 'object' && newSatuan !== null)
                    ? (newSatuan.satuan || '')
                    : String(newSatuan ?? '');
                }

                const finalHarga = newHarga !== undefined ? parseNum(newHarga) : it.harga;

                return { 
                  ...it, 
                  uraian: typeof finalUraian === 'string' ? finalUraian : String(finalUraian || ''),
                  satuan: typeof finalSatuan === 'string' ? finalSatuan : String(finalSatuan || ''),
                  harga: finalHarga
                };
              })
            }
          : c
      )
    }));
  };

  const deleteOrResetItem = (catId, itemKey) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => {
        if (c.id !== catId) return c;
        const item = c.items.find(it => it.key === itemKey);
        if (!item) return c;

        if (item.custom) {
          return { ...c, items: c.items.filter(it => it.key !== itemKey) };
        } else {
          return {
            ...c,
            items: c.items.map(it => 
              it.key === itemKey ? { ...it, volume: 0, harga: it.hargaDefault } : it
            )
          };
        }
      })
    }));
  };

  // Menerapkan reduksi efisiensi dinding bersama ke item-item BoQ terpilih
  const applySharedWallReduction = (itemKeyMap, reductionPercent = 25) => {
    const factor = (100 - reductionPercent) / 100;
    
    setState(prev => {
      let countModified = 0;
      const newCats = prev.categories.map(cat => ({
        ...cat,
        items: cat.items.map(item => {
          if (itemKeyMap[item.key]) {
            countModified++;
            const origVol = item.originalVolume !== undefined ? item.originalVolume : (item.volume || 0);
            const newVol = +(origVol * factor).toFixed(2);
            return {
              ...item,
              originalVolume: origVol,
              volume: newVol,
              sharedWallReduced: true,
              sharedWallPercent: reductionPercent
            };
          }
          return item;
        })
      }));

      showToast(`Berhasil menerapkan efisiensi dinding bersama (-${reductionPercent}%) ke ${countModified} item BoQ!`, 'success');

      return {
        ...prev,
        categories: newCats
      };
    });
  };

  // Mengembalikan volume item ke kondisi semula (Dinding Ganda penuh)
  const revertSharedWallReduction = (itemKeys = null) => {
    setState(prev => {
      let countReverted = 0;
      const newCats = prev.categories.map(cat => ({
        ...cat,
        items: cat.items.map(item => {
          if (item.sharedWallReduced && (!itemKeys || itemKeys.includes(item.key))) {
            countReverted++;
            const restoredVol = item.originalVolume !== undefined ? item.originalVolume : item.volume;
            const cleanItem = { ...item, volume: restoredVol };
            delete cleanItem.sharedWallReduced;
            delete cleanItem.sharedWallPercent;
            delete cleanItem.originalVolume;
            return cleanItem;
          }
          return item;
        })
      }));

      showToast(`Volume ${countReverted} item BoQ berhasil dikembalikan ke volume penuh!`, 'info');

      return {
        ...prev,
        categories: newCats
      };
    });
  };

  // Helper to map and resolve category IDs
  const resolveCategory = (catId, categoriesList) => {
    if (!categoriesList || categoriesList.length === 0) return null;
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

    const direct = categoriesList.find(c => c.id === targetId);
    if (direct) return direct;

    const fuzzy = categoriesList.find(c => c.name.toLowerCase().includes(targetId) || targetId.includes(c.id));
    if (fuzzy) return fuzzy;

    return categoriesList.find(c => c.id === 'struktur') || categoriesList[0];
  };

  // Queue Modal & State Handler for Calculators
  const queueCalculatedItems = (items, resetFormFn = null) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      showToast("Tidak ada item bahan yang dipilih untuk dikirim.", "warning");
      return;
    }

    const formattedItems = items.map(item => {
      const vol = item.jumlah !== undefined ? Number(item.jumlah) : (Number(item.volume) || 0);
      const prc = Number(item.harga) || 0;
      const lbl = item.label || item.uraian || 'Material Kalkulator';
      let cat = item.category || 'struktur';
      if (cat === 'arsitektur') cat = 'plafond';
      if (cat === 'sanitasi') cat = 'mep';

      return {
        id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category: cat,
        label: lbl,
        uraian: lbl,
        satuan: item.satuan || 'ls',
        jumlah: vol,
        volume: vol,
        harga: prc,
        source: item.source || 'Kalkulator'
      };
    });

    setState(prev => ({
      ...prev,
      pendingQueue: [...(prev.pendingQueue || []), ...formattedItems]
    }));

    setModalPendingData({
      isOpen: true,
      items: formattedItems,
      resetFn: resetFormFn
    });

    showToast(`${formattedItems.length} material berhasil dimasukkan ke antrian BoQ!`, 'success');
  };

  const closePendingModal = () => {
    setModalPendingData(null);
  };

  const applyPendingItem = (queueId, target = "__new__") => {
    setState(prev => {
      const pendingList = prev.pendingQueue || [];
      const queueItem = pendingList.find(q => q.id === queueId);
      if (!queueItem) return prev;

      let newCategories = JSON.parse(JSON.stringify(prev.categories));
      const qty = queueItem.jumlah !== undefined ? queueItem.jumlah : (queueItem.volume || 0);
      const itemPrice = queueItem.harga || 0;

      if (target && target !== '__new__') {
        const [targetCatId, targetItemKey] = target.split('::');
        const cat = newCategories.find(c => c.id === targetCatId);
        if (cat) {
          const itemToUpdate = cat.items.find(it => it.key === targetItemKey);
          if (itemToUpdate) {
            itemToUpdate.volume = (itemToUpdate.volume || 0) + qty;
            if (itemPrice > 0 && (!itemToUpdate.harga || itemToUpdate.harga === 0)) {
              itemToUpdate.harga = itemPrice;
            }
          }
        }
      } else {
        const cat = resolveCategory(queueItem.category, newCategories);
        if (cat) {
          const newItem = {
            code: 'CALC',
            uraian: queueItem.label || queueItem.uraian || 'Material Kalkulator',
            satuan: queueItem.satuan || 'ls',
            hargaDefault: itemPrice,
            harga: itemPrice,
            source: queueItem.source || 'Kalkulator',
            volume: qty,
            custom: true,
            key: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          };
          cat.items.push(newItem);
        }
      }

      return {
        ...prev,
        categories: newCategories,
        pendingQueue: pendingList.filter(q => q.id !== queueId)
      };
    });
    showToast("Material berhasil diterapkan ke BoQ!", "success");
  };

  const applyAllPendingItems = (targetMap = {}) => {
    setState(prev => {
      const pendingList = prev.pendingQueue || [];
      if (pendingList.length === 0) return prev;

      let newCategories = JSON.parse(JSON.stringify(prev.categories));

      pendingList.forEach(queueItem => {
        const target = targetMap[queueItem.id] || '__new__';
        const qty = queueItem.jumlah !== undefined ? queueItem.jumlah : (queueItem.volume || 0);
        const itemPrice = queueItem.harga || 0;

        if (target && target !== '__new__') {
          const [targetCatId, targetItemKey] = target.split('::');
          const cat = newCategories.find(c => c.id === targetCatId);
          if (cat) {
            const itemToUpdate = cat.items.find(it => it.key === targetItemKey);
            if (itemToUpdate) {
              itemToUpdate.volume = (itemToUpdate.volume || 0) + qty;
              if (itemPrice > 0 && (!itemToUpdate.harga || itemToUpdate.harga === 0)) {
                itemToUpdate.harga = itemPrice;
              }
            }
          }
        } else {
          const cat = resolveCategory(queueItem.category, newCategories);
          if (cat) {
            cat.items.push({
              code: 'CALC',
              uraian: queueItem.label || queueItem.uraian || 'Material Kalkulator',
              satuan: queueItem.satuan || 'ls',
              hargaDefault: itemPrice,
              harga: itemPrice,
              source: queueItem.source || 'Kalkulator',
              volume: qty,
              custom: true,
              key: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
            });
          }
        }
      });

      return {
        ...prev,
        categories: newCategories,
        pendingQueue: []
      };
    });
    showToast("Semua usulan material berhasil diterapkan ke BoQ!", "success");
  };

  const dismissPendingItem = (queueId) => {
    setState(prev => ({
      ...prev,
      pendingQueue: (prev.pendingQueue || []).filter(q => q.id !== queueId)
    }));
    showToast("Item usulan dihapus dari antrian.", "info");
  };

  const clearAllPendingItems = () => {
    setState(prev => ({
      ...prev,
      pendingQueue: []
    }));
    showToast("Antrian material kalkulator telah dikosongkan.", "info");
  };

  // Reset entire project
  const resetProject = () => {
    localStorage.removeItem(STORAGE_KEY);
    try {
      localStorage.removeItem(ACTIVE_LIBRARY_ID_KEY);
    } catch (e) {}
    setActiveLibraryId(null);
    const today = new Date().toISOString().slice(0, 10);
    setState({
      project: { name: "", location: "", date: today, client: "", libraryId: null },
      ppn: false,
      categories: ITEM_DATABASE.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        custom: false,
        expanded: false,
        items: cat.items.map((it, idx) => ({
          code: it[0],
          uraian: it[1],
          satuan: it[2],
          hargaDefault: it[3],
          harga: it[3],
          source: it[4],
          volume: 0,
          custom: false,
          key: `${cat.id}-${idx}`
        }))
      })),
      pendingQueue: []
    });
    showToast("Semua data proyek telah direset ke kondisi awal.", "info");
  };

  // ==================== LIBRARY METHODS ====================
  const executeSaveToLibrary = async (customTitle = null, isNewRevision = false, revisionNote = null) => {
    const title = (customTitle || state.project.name || "Proyek RAB Baru").trim();
    const now = new Date().toISOString();

    // Deteksi ID sasaran dengan multi-layer fallback agar proyek yang sedang diedit tidak pernah terduplikasi:
    const activeId = activeLibraryId 
      || state.project?.libraryId 
      || (typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_LIBRARY_ID_KEY) : null);

    let matchedProject = null;
    if (activeId) {
      matchedProject = library.find(p => p.id === activeId);
    }
    // Fallback pencocokan nama proyek jika ID hilang
    if (!matchedProject && !isNewRevision && title) {
      matchedProject = library.find(p => p.name && p.name.trim().toLowerCase() === title.toLowerCase());
    }

    const targetId = (!isNewRevision && matchedProject) 
      ? matchedProject.id 
      : (activeId && !isNewRevision ? activeId : `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

    // Update the state's project.name if customTitle was supplied
    if (customTitle && customTitle !== state.project.name) {
      updateProjectField('name', title);
    }
    updateProjectField('libraryId', targetId);

    const existingIndex = library.findIndex(p => p.id === targetId);

    const snapshot = normalizeState(state);
    if (customTitle) {
      snapshot.project.name = title;
    }
    snapshot.project.libraryId = targetId;

    // Kelola riwayat revisi (snapshot) otomatis hingga 5 cadangan terakhir
    let revisions = [];
    if (existingIndex >= 0) {
      const prevProject = library[existingIndex];
      const prevRevisions = Array.isArray(prevProject.revisions) ? prevProject.revisions : [];

      if (prevProject.stateSnapshot) {
        const prevSnapshotItem = {
          id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: prevProject.updatedAt || prevProject.createdAt || now,
          note: revisionNote || `Pembaruan data RAB (${prevProject.filledItemsCount || 0} item)`,
          grandTotal: prevProject.grandTotal || 0,
          subtotal: prevProject.subtotal || 0,
          filledItemsCount: prevProject.filledItemsCount || 0,
          stateSnapshot: normalizeState(prevProject.stateSnapshot)
        };
        revisions = [prevSnapshotItem, ...prevRevisions].slice(0, 5);
      } else {
        revisions = prevRevisions.slice(0, 5);
      }
    }

    const entry = normalizeLibraryProject({
      id: targetId,
      name: title,
      client: snapshot.project.client || "-",
      location: snapshot.project.location || "-",
      date: snapshot.project.date || now.slice(0, 10),
      grandTotal,
      subtotal,
      ppn: snapshot.ppn,
      ppnAmount,
      filledItemsCount,
      categoriesCount: (snapshot.categories || []).length,
      createdAt: existingIndex >= 0 ? library[existingIndex].createdAt : now,
      updatedAt: now,
      stateSnapshot: snapshot,
      revisions: revisions
    });

    let updatedLibrary = [];
    if (existingIndex >= 0) {
      updatedLibrary = library.map((p, idx) => idx === existingIndex ? entry : p);
    } else {
      updatedLibrary = [entry, ...library];
    }

    // Bawa isian kalkulator ikut ke proyek tujuan: draft → dipindah, revisi baru → disalin
    const sourceScope = activeLibraryId || null;
    if (sourceScope !== targetId) {
      copyCalculatorScope(sourceScope, targetId, { move: !sourceScope });
    }

    setLibrary(updatedLibrary);
    setActiveLibraryId(targetId);
    try {
      localStorage.setItem(ACTIVE_LIBRARY_ID_KEY, targetId);
    } catch (e) {}
    setSaveModalOpen(false);

    showToast(
      existingIndex >= 0 
        ? `Proyek "${title}" berhasil diperbarui di Library!` 
        : `Proyek "${title}" berhasil disimpan ke Library!`, 
      "success"
    );

    // Background sync to Cloud (non-blocking)
    try {
      uploadLibraryToCloud(updatedLibrary, { 
        firebase: firebaseConfig,
        isMasterDevice: cloudConfig.isMasterDevice
      }).then(uploadRes => {
        if (uploadRes && uploadRes.library && Array.isArray(uploadRes.library)) {
          setLibrary(normalizeLibrary(uploadRes.library));
        }
      }).catch(e => {
        console.warn("Background cloud sync info:", e);
      });
    } catch (e) {
      console.warn("Background sync error:", e);
    }

    return entry;
  };

  const saveToLibrary = (customTitle = null, isNewRevision = false, revisionNote = null) => {
    requireAuthorization(() => {
      executeSaveToLibrary(customTitle, isNewRevision, revisionNote);
    }, isNewRevision ? 'menyimpan proyek baru ke Library' : 'memperbarui proyek di Library');
  };

  // -------------------------------------------------------------
  // FITUR NO. 5: MANAJEMEN RIWAYAT VERSI (SNAPSHOT / ROLLBACK)
  // -------------------------------------------------------------
  const restoreProjectRevision = (projectId, revisionId) => {
    requireAuthorization(async () => {
      const projectIndex = library.findIndex(p => p.id === projectId);
      if (projectIndex === -1) {
        showToast("Proyek tidak ditemukan di Library.", "error");
        return;
      }

      const targetProject = library[projectIndex];
      const revisions = Array.isArray(targetProject.revisions) ? targetProject.revisions : [];
      const targetRevision = revisions.find(r => r.id === revisionId);

      if (!targetRevision || !targetRevision.stateSnapshot) {
        showToast("Snapshot revisi tidak ditemukan atau rusak.", "error");
        return;
      }

      const now = new Date().toISOString();
      // Buat snapshot pengaman dari versi aktif sebelum di-rollback
      const safetySnapshot = {
        id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: targetProject.updatedAt || now,
        note: `Versi sebelum rollback ke revisi tanggal ${new Date(targetRevision.timestamp).toLocaleDateString('id-ID')}`,
        grandTotal: targetProject.grandTotal || 0,
        subtotal: targetProject.subtotal || 0,
        filledItemsCount: targetProject.filledItemsCount || 0,
        stateSnapshot: normalizeState(targetProject.stateSnapshot)
      };

      const remainingRevisions = revisions.filter(r => r.id !== revisionId);
      const updatedRevisions = [safetySnapshot, ...remainingRevisions].slice(0, 5);

      const restoredState = normalizeState(targetRevision.stateSnapshot);
      if (!restoredState.project) restoredState.project = {};
      restoredState.project.libraryId = projectId;

      const updatedEntry = normalizeLibraryProject({
        ...targetProject,
        grandTotal: targetRevision.grandTotal,
        subtotal: targetRevision.subtotal,
        filledItemsCount: targetRevision.filledItemsCount,
        updatedAt: now,
        stateSnapshot: restoredState,
        revisions: updatedRevisions
      });

      const updatedLibrary = library.map((p, idx) => idx === projectIndex ? updatedEntry : p);
      setLibrary(updatedLibrary);
      setState(restoredState);
      setActiveLibraryId(projectId);
      try {
        localStorage.setItem(ACTIVE_LIBRARY_ID_KEY, projectId);
      } catch (e) {}

      showToast(`Snapshot revisi berhasil dipulihkan (Rollback) ke BoQ!`, "success");

      try {
        await uploadLibraryToCloud(updatedLibrary, {
          firebase: firebaseConfig,
          isMasterDevice: cloudConfig.isMasterDevice
        });
      } catch (e) {
        console.error("Rollback cloud sync error:", e);
      }
    }, 'memulihkan (rollback) snapshot revisi proyek');
  };

  const createProjectSnapshot = (projectId, customNote = null) => {
    requireAuthorization(async () => {
      const projectIndex = library.findIndex(p => p.id === projectId);
      if (projectIndex === -1) return;

      const targetProject = library[projectIndex];
      const now = new Date().toISOString();
      const existingRevisions = Array.isArray(targetProject.revisions) ? targetProject.revisions : [];

      const newSnapshot = {
        id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
        note: customNote || `Snapshot cadangan manual (${targetProject.filledItemsCount || 0} item)`,
        grandTotal: targetProject.grandTotal || 0,
        subtotal: targetProject.subtotal || 0,
        filledItemsCount: targetProject.filledItemsCount || 0,
        stateSnapshot: normalizeState(targetProject.stateSnapshot)
      };

      const updatedRevisions = [newSnapshot, ...existingRevisions].slice(0, 5);
      const updatedEntry = normalizeLibraryProject({
        ...targetProject,
        revisions: updatedRevisions
      });

      const updatedLibrary = library.map((p, idx) => idx === projectIndex ? updatedEntry : p);
      setLibrary(updatedLibrary);
      showToast(`Snapshot cadangan "${newSnapshot.note}" berhasil disimpan!`, "success");

      try {
        await uploadLibraryToCloud(updatedLibrary, {
          firebase: firebaseConfig,
          isMasterDevice: cloudConfig.isMasterDevice
        });
      } catch (e) {}
    }, 'membuat snapshot cadangan manual');
  };

  const deleteProjectRevision = (projectId, revisionId) => {
    requireAuthorization(async () => {
      const projectIndex = library.findIndex(p => p.id === projectId);
      if (projectIndex === -1) return;

      const targetProject = library[projectIndex];
      const existingRevisions = Array.isArray(targetProject.revisions) ? targetProject.revisions : [];
      const updatedRevisions = existingRevisions.filter(r => r.id !== revisionId);

      const updatedEntry = {
        ...targetProject,
        revisions: updatedRevisions
      };

      const updatedLibrary = library.map((p, idx) => idx === projectIndex ? updatedEntry : p);
      setLibrary(updatedLibrary);
      showToast(`Snapshot revisi berhasil dihapus.`, "info");

      try {
        await uploadLibraryToCloud(updatedLibrary, {
          firebase: firebaseConfig,
          isMasterDevice: cloudConfig.isMasterDevice
        });
      } catch (e) {}
    }, 'menghapus snapshot revisi proyek');
  };

  const loadFromLibrary = (projectId) => {
    const entry = library.find(p => p.id === projectId);
    if (!entry || !entry.stateSnapshot) {
      alert("Data proyek di library tidak ditemukan atau rusak.");
      return;
    }

    // Deep clone and normalize the snapshot into current active state
    const normalized = normalizeState(entry.stateSnapshot);
    if (!normalized.project) normalized.project = {};
    normalized.project.libraryId = projectId;
    setState(normalized);
    setActiveLibraryId(projectId);
    try {
      localStorage.setItem(ACTIVE_LIBRARY_ID_KEY, projectId);
    } catch (e) {}
    setActiveTab('boq');
    showToast(`Proyek "${entry.name}" berhasil dibuka! Anda dapat merevisi langsung dari BoQ.`, "info");
  };

  const executeDeleteFromLibrary = async (projectId) => {
    const target = library.find(p => p.id === projectId);
    const name = target ? target.name : "Proyek";
    
    addDeletedProjectId(projectId);
    clearCalculatorScope(projectId);
    const updatedLibrary = library.filter(p => p.id !== projectId);
    setLibrary(updatedLibrary);
    if (activeLibraryId === projectId) {
      setActiveLibraryId(null);
      try {
        localStorage.removeItem(ACTIVE_LIBRARY_ID_KEY);
      } catch (e) {}
    }
    showToast(`Menghapus proyek "${name}" dari Library & Cloud...`, "info");

    try {
      await uploadLibraryToCloud(updatedLibrary, { 
        firebase: firebaseConfig, 
        overwrite: true, 
        isMasterDevice: true 
      });
      showToast(`Proyek "${name}" berhasil dihapus permanen dari Library & Cloud.`, "info");
    } catch (e) {
      console.error("Delete sync error:", e);
    }
  };

  const deleteFromLibrary = (projectId) => {
    if (!cloudConfig.isMasterDevice) {
      showToast("⛔ Akses Ditolak: Hanya PC Utama (Master) yang berhak menghapus proyek dari Library.", "error");
      return;
    }
    executeDeleteFromLibrary(projectId);
  };

  const executeDuplicateLibraryProject = async (projectId) => {
    const target = library.find(p => p.id === projectId);
    if (!target) return;

    const now = new Date().toISOString();
    const newId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const clonedSnapshot = normalizeState(target.stateSnapshot);
    const newTitle = `${target.name} (Salinan)`;
    clonedSnapshot.project.name = newTitle;
    clonedSnapshot.project.libraryId = newId;

    const clonedEntry = normalizeLibraryProject({
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      name: newTitle,
      createdAt: now,
      updatedAt: now,
      stateSnapshot: clonedSnapshot
    });

    copyCalculatorScope(projectId, newId);

    const updatedLibrary = [clonedEntry, ...library];
    setLibrary(updatedLibrary);
    showToast(`Menduplikasi "${newTitle}" & mengunggah ke Cloud...`, "info");

    try {
      const uploadRes = await uploadLibraryToCloud(updatedLibrary, { 
        firebase: firebaseConfig,
        isMasterDevice: cloudConfig.isMasterDevice 
      });
      if (uploadRes && uploadRes.library && Array.isArray(uploadRes.library)) {
        setLibrary(normalizeLibrary(uploadRes.library));
      }
      showToast(`Salinan "${newTitle}" berhasil ditambahkan ke Library & Cloud!`, "success");
    } catch (e) {
      console.error("Duplicate sync error:", e);
    }
  };

  const duplicateLibraryProject = (projectId) => {
    requireAuthorization(async () => {
      await executeDuplicateLibraryProject(projectId);
    }, 'menduplikasi proyek di Library');
  };

  const exportLibraryBackup = () => {
    if (!library || library.length === 0) {
      alert("Library masih kosong, tidak ada data untuk diexport.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(library, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sr-studio-library-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("File backup Library (.json) berhasil diunduh!", "success");
  };

  const importLibraryFromJson = (jsonData) => {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const normalizedImport = normalizeLibrary(parsed);
      if (normalizedImport.length > 0) {
        const merged = mergeLibraries(library, normalizedImport);
        const safeMerged = normalizeLibrary(merged);
        setLibrary(safeMerged);
        uploadLibraryToCloud(safeMerged, { firebase: firebaseConfig }).catch(console.error);
        showToast(`Berhasil mengimpor ${normalizedImport.length} proyek ke Library & Cloud!`, "success");
        return true;
      } else {
        alert("Format file JSON tidak valid. Pastikan file berisi daftar proyek Library.");
        return false;
      }
    } catch (e) {
      console.error("Failed to import library JSON:", e);
      alert("Gagal membaca file JSON: " + e.message);
      return false;
    }
  };

  // Computed Totals (memoized — cegah re-render tiap ketik)
  const { subtotal, ppnAmount, grandTotal, filledItemsCount } = useMemo(
    () => calcTotals(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.categories, state?.ppn]
  );

  const contextValue = useMemo(() => ({
        state,
        activeTab,
        setActiveTab,
        lastSaved,
        modalPendingData,
        closePendingModal,
        library,
        activeLibraryId,
        saveModalOpen,
        setSaveModalOpen,
        documentModalOpen,
        setDocumentModalOpen,
        scheduleModalOpen,
        setScheduleModalOpen,
        materialTakeoffModalOpen,
        setMaterialTakeoffModalOpen,
        scheduleConfig,
        updateScheduleDuration,
        updateScheduleStartDate,
        updateCategorySchedule,
        updateActualProgress,
        resetScheduleToDefault,
        toastMessage,
        showToast,
        saveToLibrary,
        loadFromLibrary,
        deleteFromLibrary,
        duplicateLibraryProject,
        restoreProjectRevision,
        createProjectSnapshot,
        deleteProjectRevision,
        updateProjectField,
        clusterUnits: state.project?.clusterUnits || 1,
        updateClusterUnits,
        clusterTypology: state.project?.clusterTypology || 'double',
        updateClusterTypology,
        clusterRowUnits: state.project?.clusterRowUnits || state.project?.clusterUnits || 4,
        updateClusterRowUnits,
        togglePpn,
        toggleCategoryExpand,
        expandAllCategories,
        updateCategoryName,
        addCustomCategory,
        deleteCategory,
        addCustomItem,
        applyLaborTakeoff,
        updateItemVolume,
        updateItemPrice,
        updateCustomItem,
        deleteOrResetItem,
        applySharedWallReduction,
        revertSharedWallReduction,
        queueCalculatedItems,
        applyPendingItem,
        applyAllPendingItems,
        dismissPendingItem,
        clearAllPendingItems,
        resetProject,
        subtotal,
        ppnAmount,
        grandTotal,
        filledItemsCount,
        // Role & Landing Page Session
        sessionRole,
        selectSessionRole,
        logoutToLandingPage,
        unlockedTabs,
        isTabLockedForClient,
        CLIENT_FREE_TABS,
        // Cloud & Security Context
        cloudConfig,
        updateCloudSettings,
        firebaseConfig,
        updateFirebaseSettings,
        testFirebaseConnection,
        syncCloudLibrary,
        isCloudSyncing,
        cloudModalOpen,
        setCloudModalOpen,
        isOtpAuthorized,
        setIsOtpAuthorized,
        otpModalData,
        closeOtpModal,
        requireAuthorization,
        exportLibraryBackup,
        importLibraryFromJson,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }), [
        state, activeTab, lastSaved, modalPendingData, library, activeLibraryId,
        saveModalOpen, documentModalOpen, scheduleModalOpen, materialTakeoffModalOpen,
        scheduleConfig, toastMessage, cloudConfig, firebaseConfig, isCloudSyncing,
        cloudModalOpen, isOtpAuthorized, otpModalData, sessionRole, unlockedTabs,
        subtotal, ppnAmount, grandTotal, filledItemsCount,
      ]);

  return (
    <BoQContext.Provider value={contextValue}>
      <CalculatorScopeProvider scope={activeLibraryId}>
        {children}
      </CalculatorScopeProvider>
    </BoQContext.Provider>
  );
}

export function useBoQ() {
  const context = useContext(BoQContext);
  if (!context) {
    throw new Error("useBoQ must be used within a BoQProvider");
  }
  return context;
}
