import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  blankState,
  calcTotals,
  DEFAULT_SCHEDULE_WEEKS,
  ensureOrder,
  getDefaultCategorySchedules,
  normalizeLibrary,
  normalizeLibraryProject,
  normalizeSchedule,
  normalizeState,
} from '../utils/normalize';
import * as actions from './boqActions';
import { engine, engineBridge, useCloud } from './cloudStore';
import { MASTER_EMAIL, STORAGE_KEYS } from '../services/cloud/config';
import {
  defaultDisplayName,
  getClientId,
  getSessionId,
  getStoredDisplayName,
  getStoredRole,
  ROLES,
  setStoredDisplayName,
  setStoredRole,
  verifyMasterCode,
} from '../services/cloud/identity';
import { localStore } from '../services/storage/localStore';

const BoQContext = createContext(null);

// Re-export agar import lama (`from '../context/BoQContext'`) tetap berfungsi.
export { getDefaultCategorySchedules, normalizeState, normalizeLibraryProject, normalizeLibrary };

/** Tab yang boleh dibuka Klien tanpa izin OTP. */
export const CLIENT_FREE_TABS = Object.freeze(['dashboard', 'schedule', 'library']);
const SCHEDULE_EDIT_GRANT = 'schedule:edit';

const TAB_LABELS = {
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
  infrastructure: 'Kalkulator Infrastruktur & Kawasan',
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/* ------------------------------------------------------------------ State awal (dari perangkat) */

function loadInitialState() {
  const saved = localStore.get(STORAGE_KEYS.boqState);
  return saved && (saved.categories || saved.project) ? normalizeState(saved) : blankState();
}

/** Jadwal bawaan versi lama (tidak pernah diubah pengguna) diperlakukan sebagai "belum diatur". */
function isUntouchedSchedule(schedule, categories) {
  if (schedule.durationWeeks !== DEFAULT_SCHEDULE_WEEKS || Object.keys(schedule.actualProgress).length > 0) return false;
  const matches = (defaults) =>
    Object.keys(schedule.categorySchedules).every((catId) => {
      const expected = defaults[catId];
      const actual = schedule.categorySchedules[catId];
      return expected && expected.startWeek === actual.startWeek && expected.endWeek === actual.endWeek;
    });
  return (
    matches(getDefaultCategorySchedules(DEFAULT_SCHEDULE_WEEKS)) ||
    matches(getDefaultCategorySchedules(DEFAULT_SCHEDULE_WEEKS, categories))
  );
}

function loadInitialSchedule(state) {
  const saved = normalizeSchedule(localStore.get(STORAGE_KEYS.schedule));
  return saved && !isUntouchedSchedule(saved, state.categories) ? saved : null;
}

const loadInitialDocId = () => localStore.getRaw(STORAGE_KEYS.activeDocId) || null;

function downloadJson(filename, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ Provider */

export function BoQProvider({ children }) {
  // Dokumen kerja (RAB + jadwal). `scheduleConfig === null` berarti jadwal bawaan.
  const [state, setStateRaw] = useState(loadInitialState);
  const [scheduleConfig, setScheduleRaw] = useState(() => loadInitialSchedule(state));
  const [activeDocId, setActiveDocId] = useState(loadInitialDocId);

  // Sesi pengguna
  const [sessionRole, setSessionRole] = useState(getStoredRole);
  const [displayName, setDisplayNameState] = useState(getStoredDisplayName);
  const [unlockedTabs, setUnlockedTabs] = useState([]);

  // UI
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [materialTakeoffModalOpen, setMaterialTakeoffModalOpen] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [modalPendingData, setModalPendingData] = useState(null); // { isOpen, items, resetFn }
  const [otpModalData, setOtpModalData] = useState({ isOpen: false, onSuccess: null, actionName: '' });
  const [toastMessage, setToastMessage] = useState(null); // { text, type }

  const cloudLibrary = useCloud((snapshot) => snapshot.library);
  const cloudReady = useCloud((snapshot) => snapshot.ready);
  const isDocLoading = useCloud((snapshot) => snapshot.docLoading);

  const isMaster = sessionRole === ROLES.master;
  const canEdit = isMaster || unlockedTabs.length > 0;
  const effectiveName = displayName || defaultDisplayName(sessionRole || ROLES.client);

  /* ---------------------------------------------------------------- Toast */

  const toastTimer = useRef(null);
  const showToast = useCallback((text, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToastMessage({ text, type });
    toastTimer.current = setTimeout(() => setToastMessage(null), type === 'error' ? 6000 : 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ---------------------------------------------------------------- Jembatan ke SyncEngine */

  const stateRef = useRef(state);
  const docIdRef = useRef(activeDocId);
  stateRef.current = state;
  docIdRef.current = activeDocId;

  const mutate = useCallback((producer) => setStateRaw((prev) => ensureOrder(producer(prev))), []);

  /** Mengubah state sekaligus mencerminkannya ke engine saat itu juga (dipakai sebelum operasi cloud). */
  const mutateNow = useCallback((producer) => {
    const next = ensureOrder(producer(stateRef.current));
    stateRef.current = next;
    setStateRaw(next);
    engine.setLocalBoq(next, docIdRef.current);
  }, []);

  const handleDocChange = useCallback(
    (docId, info) => {
      setActiveDocId(docId);
      docIdRef.current = docId;
      const linkTo = (id) => (prev) => ({ ...prev, project: { ...prev.project, libraryId: id } });

      switch (info.reason) {
        case 'open': {
          const next = info.state ? linkTo(docId)(info.state) : linkTo(docId)(blankState());
          setStateRaw(next);
          setScheduleRaw(info.schedule || null);
          break;
        }
        case 'create':
          setStateRaw((prev) => {
            const linked = linkTo(docId)(prev);
            return info.name ? { ...linked, project: { ...linked.project, name: info.name } } : linked;
          });
          break;
        case 'reset':
          setStateRaw(blankState());
          setScheduleRaw(null);
          break;
        case 'deleted':
          if (info.keepLocal) {
            setStateRaw(linkTo(null));
            showToast(
              `Proyek "${info.name || 'ini'}" sudah tidak ada di Library. Isinya tetap ada di perangkat ini sebagai draf.`,
              'info'
            );
          } else {
            setStateRaw(blankState());
            setScheduleRaw(null);
            showToast(`Proyek "${info.name || 'ini'}" telah dihapus dari Library oleh pengguna lain.`, 'info');
          }
          break;
        case 'diverged':
          setStateRaw(linkTo(null));
          showToast(
            `Perubahan lokal pada "${info.name || 'proyek'}" yang belum pernah disimpan dijadikan draf terpisah. ` +
              'Tekan Simpan untuk memperbarui proyek aslinya.',
            'info'
          );
          break;
        default:
          setStateRaw(linkTo(null));
      }
    },
    [showToast]
  );

  // Jembatan dipasang saat render agar engine selalu memanggil versi terbaru.
  engineBridge.applyBoq = (updater) => setStateRaw((prev) => ensureOrder(updater(prev)));
  engineBridge.applySchedule = (updater) => setScheduleRaw((prev) => updater(prev));
  engineBridge.onDocChange = handleDocChange;
  engineBridge.notify = showToast;
  engineBridge.identity = {
    id: getClientId(),
    sessionId: getSessionId(),
    name: effectiveName,
    role: sessionRole || 'guest',
  };

  // Sesi dokumen dilanjutkan sekali, sebelum efek sinkronisasi pertama berjalan.
  const resumed = useRef(false);
  if (!resumed.current) {
    resumed.current = true;
    engine.resume(activeDocId, { state, schedule: scheduleConfig });
  }

  useEffect(() => {
    if (sessionRole) engine.start();
  }, [sessionRole]);

  useEffect(() => {
    engine.setLocalBoq(state, activeDocId);
  }, [state, activeDocId]);

  useEffect(() => {
    engine.setLocalSchedule(scheduleConfig, activeDocId);
  }, [scheduleConfig, activeDocId]);

  useEffect(() => {
    engine.setCanWrite(Boolean(sessionRole) && canEdit);
  }, [sessionRole, canEdit]);

  useEffect(() => {
    engine.identityChanged();
  }, [sessionRole, effectiveName]);

  useEffect(() => {
    engine.setPresence({ tab: activeTab });
    if (activeTab === 'library') engine.refreshStaleSnapshots();
  }, [activeTab]);

  // Simpan seketika saat tab disembunyikan/ditutup agar tidak ada ketikan yang tertinggal.
  useEffect(() => {
    const flush = () => engine.commit();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  /* ---------------------------------------------------------------- Peran & otorisasi */

  const selectSessionRole = useCallback((role) => {
    setStoredRole(role);
    setSessionRole(role === ROLES.master || role === ROLES.client ? role : null);
    setUnlockedTabs([]);
  }, []);

  /** @returns {Promise<boolean>} true bila Master Code benar */
  const loginAsMaster = useCallback(
    async (code) => {
      const valid = await verifyMasterCode(code);
      if (valid) selectSessionRole(ROLES.master);
      return valid;
    },
    [selectSessionRole]
  );

  const logoutToLandingPage = useCallback(() => {
    selectSessionRole(null);
    setCloudModalOpen(false);
    showToast('Anda telah keluar ke Portal Utama.', 'info');
  }, [selectSessionRole, showToast]);

  const setDisplayName = useCallback((name) => setDisplayNameState(setStoredDisplayName(name)), []);

  const closeOtpModal = useCallback(() => setOtpModalData({ isOpen: false, onSuccess: null, actionName: '' }), []);

  /** Master langsung jalan; Klien harus memasukkan Kode OTP sekali pakai dari Master. */
  const requireAuthorization = useCallback(
    (actionCallback, actionName = 'menyimpan') => {
      if (isMaster) {
        actionCallback();
        return;
      }
      setOtpModalData({ isOpen: true, onSuccess: actionCallback, actionName });
    },
    [isMaster]
  );

  const redeemOtp = useCallback((code, purpose) => engine.redeemOtp(code, purpose), []);

  const isTabLockedForClient = useCallback(
    (tabId) => !isMaster && !CLIENT_FREE_TABS.includes(tabId) && !unlockedTabs.includes(tabId),
    [isMaster, unlockedTabs]
  );

  const setActiveTab = useCallback(
    (tabId) => {
      if (!isTabLockedForClient(tabId)) {
        setActiveTabState(tabId);
        return;
      }
      const label = TAB_LABELS[tabId] || 'fitur ini';
      requireAuthorization(() => {
        setUnlockedTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
        setActiveTabState(tabId);
        showToast(`Izin OTP berhasil! ${label} terbuka — input Anda tersinkron realtime.`, 'success');
      }, `mengakses ${label}`);
    },
    [isTabLockedForClient, requireAuthorization, showToast]
  );

  /* ---------------------------------------------------------------- Proyek & kategori */

  const updateProjectField = (field, value) => mutate((prev) => actions.setProjectField(prev, field, value));
  const updateClusterUnits = (units) => updateProjectField('clusterUnits', Math.max(1, Math.min(500, parseInt(units, 10) || 1)));
  const updateClusterTypology = (typology) => updateProjectField('clusterTypology', typology === 'shared' ? 'shared' : 'double');
  const updateClusterRowUnits = (units) => updateProjectField('clusterRowUnits', Math.max(2, Math.min(50, parseInt(units, 10) || 2)));
  const togglePpn = () => mutate(actions.togglePpn);
  const toggleCategoryExpand = (catId) => mutate((prev) => actions.toggleCategoryExpand(prev, catId));
  const expandAllCategories = (expand = true) => mutate((prev) => actions.expandAllCategories(prev, expand));
  const addCustomCategory = (name) => mutate((prev) => actions.addCategory(prev, name));

  const isStandardCategory = (catId) => {
    const category = state.categories.find((cat) => cat.id === catId);
    return Boolean(category && !category.custom);
  };

  const updateCategoryName = (catId, newName) => {
    if (!isMaster && isStandardCategory(catId)) {
      showToast('Nama kategori standar tidak dapat diubah pada Mode Klien.', 'info');
      return;
    }
    mutate((prev) => actions.renameCategory(prev, catId, newName));
  };

  const deleteCategory = (catId) => {
    if (!isMaster && isStandardCategory(catId)) {
      showToast('Kategori standar tidak dapat dihapus pada Mode Klien.', 'error');
      return;
    }
    mutate((prev) => actions.removeCategory(prev, catId));
  };

  /* ---------------------------------------------------------------- Item */

  const addCustomItem = (catId, uraianOrObject, satuan, harga, volume = 0) => {
    const input = actions.normalizeCustomItemInput(uraianOrObject, satuan, harga, volume);
    mutate((prev) => actions.addCustomItem(prev, catId, input));
  };

  const applyLaborTakeoff = (laborItems, targetCategoryId = 'upah_tenaga') => {
    if (!Array.isArray(laborItems) || laborItems.length === 0) return 0;
    mutate((prev) => actions.applyLaborTakeoff(prev, laborItems, targetCategoryId));
    return laborItems.length;
  };

  const updateItemVolume = (catId, itemKey, value) => mutate((prev) => actions.setItemVolume(prev, catId, itemKey, value));

  const updateItemPrice = (catId, itemKey, value) => {
    if (!isMaster) {
      const item = state.categories.find((cat) => cat.id === catId)?.items.find((it) => it.key === itemKey);
      if (item && !item.custom) {
        showToast('Harga satuan standar hanya dapat diubah oleh Master Studio.', 'error');
        return;
      }
    }
    mutate((prev) => actions.setItemPrice(prev, catId, itemKey, value));
  };

  const updateCustomItem = (catId, itemKey, uraianOrObject, maybeSatuan, maybeHarga) =>
    mutate((prev) => actions.updateCustomItem(prev, catId, itemKey, uraianOrObject, maybeSatuan, maybeHarga));

  const deleteOrResetItem = (catId, itemKey) => mutate((prev) => actions.deleteOrResetItem(prev, catId, itemKey));

  const applySharedWallReduction = (itemKeyMap, reductionPercent = 25) => {
    const { count } = actions.applySharedWallReduction(state, itemKeyMap, reductionPercent);
    mutate((prev) => actions.applySharedWallReduction(prev, itemKeyMap, reductionPercent).state);
    showToast(`Efisiensi dinding bersama (-${reductionPercent}%) diterapkan ke ${count} item BoQ.`, 'success');
  };

  const revertSharedWallReduction = (itemKeys = null) => {
    const { count } = actions.revertSharedWallReduction(state, itemKeys);
    mutate((prev) => actions.revertSharedWallReduction(prev, itemKeys).state);
    showToast(`Volume ${count} item BoQ dikembalikan ke volume penuh.`, 'info');
  };

  /* ---------------------------------------------------------------- Antrian kalkulator */

  const queueCalculatedItems = (items, resetFormFn = null) => {
    if (!Array.isArray(items) || items.length === 0) {
      showToast('Tidak ada item bahan yang dipilih untuk dikirim.', 'warning');
      return;
    }
    const queueItems = actions.formatQueueItems(items);
    mutate((prev) => actions.enqueueItems(prev, queueItems));
    setModalPendingData({ isOpen: true, items: queueItems, resetFn: resetFormFn });
    showToast(`${queueItems.length} material masuk ke antrian BoQ.`, 'success');
  };

  const closePendingModal = () => setModalPendingData(null);

  const applyPendingItem = (queueId, target = '__new__') => {
    mutate((prev) => actions.applyPendingItem(prev, queueId, target));
    showToast('Material berhasil diterapkan ke BoQ.', 'success');
  };

  const applyAllPendingItems = (targetMap = {}) => {
    mutate((prev) => actions.applyAllPendingItems(prev, targetMap));
    showToast('Semua usulan material diterapkan ke BoQ.', 'success');
  };

  const dismissPendingItem = (queueId) => {
    mutate((prev) => actions.dismissPendingItem(prev, queueId));
    showToast('Item usulan dihapus dari antrian.', 'info');
  };

  const clearAllPendingItems = () => {
    mutate(actions.clearPendingItems);
    showToast('Antrian material kalkulator dikosongkan.', 'info');
  };

  /* ---------------------------------------------------------------- Jadwal / Kurva S */

  const effectiveSchedule = useMemo(
    () =>
      scheduleConfig || {
        durationWeeks: DEFAULT_SCHEDULE_WEEKS,
        startDate: state.project?.date || todayIso(),
        categorySchedules: getDefaultCategorySchedules(DEFAULT_SCHEDULE_WEEKS, state.categories),
        actualProgress: {},
      },
    [scheduleConfig, state.categories, state.project?.date]
  );
  const scheduleRef = useRef(effectiveSchedule);
  scheduleRef.current = effectiveSchedule;

  /**
   * Jadwal proyek di Library adalah data bersama: Klien boleh melihat bebas, tetapi
   * mengubahnya butuh izin OTP sekali per sesi.
   */
  const mutateSchedule = (producer) => {
    const apply = () => setScheduleRaw((prev) => producer(prev || scheduleRef.current));
    if (isMaster || !activeDocId || unlockedTabs.length > 0) {
      apply();
      return;
    }
    requireAuthorization(() => {
      setUnlockedTabs((prev) => (prev.includes(SCHEDULE_EDIT_GRANT) ? prev : [...prev, SCHEDULE_EDIT_GRANT]));
      apply();
      showToast('Izin OTP berhasil! Jadwal & progres dapat diedit dan tersinkron realtime.', 'success');
    }, 'mengubah jadwal & progres Kurva S');
  };

  const updateScheduleDuration = (weeks) => {
    const duration = Math.max(2, Math.min(52, parseInt(weeks, 10) || DEFAULT_SCHEDULE_WEEKS));
    mutateSchedule((prev) => ({
      ...prev,
      durationWeeks: duration,
      categorySchedules: getDefaultCategorySchedules(duration, state.categories),
    }));
    showToast(`Durasi jadwal diatur ke ${duration} Minggu`, 'info');
  };

  const updateScheduleStartDate = (startDate) => mutateSchedule((prev) => ({ ...prev, startDate }));

  const updateCategorySchedule = (catId, startWeek, endWeek) =>
    mutateSchedule((prev) => {
      const start = Math.max(1, Math.min(prev.durationWeeks, parseInt(startWeek, 10) || 1));
      const end = Math.max(start, Math.min(prev.durationWeeks, parseInt(endWeek, 10) || 1));
      return { ...prev, categorySchedules: { ...prev.categorySchedules, [catId]: { startWeek: start, endWeek: end } } };
    });

  const updateActualProgress = (weekIdx, value) =>
    mutateSchedule((prev) => ({
      ...prev,
      actualProgress: { ...prev.actualProgress, [weekIdx]: Math.max(0, Math.min(100, parseFloat(value) || 0)) },
    }));

  const resetScheduleToDefault = () => {
    mutateSchedule((prev) => ({
      ...prev,
      categorySchedules: getDefaultCategorySchedules(prev.durationWeeks, state.categories),
      actualProgress: {},
    }));
    showToast('Jadwal & Kurva S di-reset ke rekomendasi urutan standar konstruksi.', 'info');
  };

  /* ---------------------------------------------------------------- Total & Library */

  const { subtotal, ppnAmount, grandTotal, filledItemsCount } = useMemo(
    () => calcTotals(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.categories, state.ppn]
  );

  /** Daftar Library: entri dokumen aktif selalu mencerminkan isi yang sedang tampil di layar. */
  const library = useMemo(
    () =>
      cloudLibrary.map((entry) =>
        entry.id !== activeDocId
          ? entry
          : {
              ...entry,
              name: state.project?.name?.trim() || entry.name,
              client: state.project?.client?.trim() || entry.client,
              location: state.project?.location?.trim() || entry.location,
              subtotal,
              ppn: state.ppn,
              ppnAmount,
              grandTotal,
              filledItemsCount,
              categoriesCount: state.categories.length,
              stateSnapshot: state,
              scheduleSnapshot: scheduleConfig,
            }
      ),
    [cloudLibrary, activeDocId, state, scheduleConfig, subtotal, ppnAmount, grandTotal, filledItemsCount]
  );

  const activeProject = useMemo(() => library.find((entry) => entry.id === activeDocId) || null, [library, activeDocId]);

  /** Menjalankan operasi cloud async dengan pelaporan hasil yang konsisten. */
  const runCloudTask = async (task, { success, failure = 'Operasi cloud gagal' } = {}) => {
    try {
      const result = await task();
      if (success) showToast(typeof success === 'function' ? success(result) : success, 'success');
      return result;
    } catch (error) {
      console.error('[SR Studio]', failure, error);
      showToast(`${failure}: ${error?.message || error}`, 'error');
      return undefined;
    }
  };

  const executeSaveToLibrary = async (customTitle, isNewCopy, revisionNote) => {
    const title = String(customTitle || state.project.name || 'Proyek RAB Baru').trim();
    setSaveModalOpen(false);
    if (!cloudReady) {
      if (title !== state.project.name) mutate((prev) => actions.setProjectField(prev, 'name', title));
      showToast(
        'Belum terhubung ke cloud. Data tetap aman di perangkat ini dan otomatis tersinkron saat online.',
        'info'
      );
      return;
    }

    await runCloudTask(
      async () => {
        const isSavedProject = Boolean(activeProject && activeProject.status !== 'draft');
        if (isSavedProject && isNewCopy) {
          await engine.saveAsNew({ name: title });
          return `Salinan "${title}" dibuat sebagai proyek baru di Library.`;
        }
        if (title !== state.project.name) mutateNow((prev) => actions.setProjectField(prev, 'name', title));
        if (isSavedProject) {
          await engine.checkpoint(activeDocId, { note: revisionNote || undefined });
          return `Versi "${title}" disimpan ke Riwayat. Perubahan Anda sudah tersinkron realtime.`;
        }

        // Draf / area kerja lokal: perbarui proyek tersimpan bernama sama, atau jadikan proyek baru.
        const twin = isNewCopy
          ? null
          : library.find((entry) => entry.status !== 'draft' && entry.id !== activeDocId && sameName(entry.name, title));
        if (twin) {
          await engine.mergeIntoProject(twin.id, { note: revisionNote || undefined });
          return `Proyek "${title}" diperbarui. Versi sebelumnya dicadangkan di Riwayat.`;
        }
        if (!activeDocId) engine.createFromLocal({ status: 'saved', name: title });
        else await engine.promoteDraft(activeDocId, { note: revisionNote || undefined });
        return `Proyek "${title}" tersimpan di Library & tersinkron realtime.`;
      },
      { success: (message) => message, failure: 'Gagal menyimpan ke Library' }
    );
  };

  const saveToLibrary = (customTitle = null, isNewCopy = false, revisionNote = null) =>
    requireAuthorization(
      () => executeSaveToLibrary(customTitle, isNewCopy, revisionNote),
      isNewCopy ? 'menyimpan proyek baru ke Library' : 'menyimpan proyek ke Library'
    );

  const loadFromLibrary = (projectId) => {
    const entry = library.find((project) => project.id === projectId);
    if (!entry) {
      showToast('Proyek tidak ditemukan di Library.', 'error');
      return;
    }
    engine.openProject(projectId);
    setActiveTab('boq');
    showToast(`Proyek "${entry.name}" dibuka. Semua perubahan tersimpan & tersinkron otomatis.`, 'info');
  };

  const deleteFromLibrary = (projectId) => {
    if (!isMaster) {
      showToast('Akses ditolak: hanya Master yang berhak menghapus proyek dari Library.', 'error');
      return;
    }
    runCloudTask(() => engine.deleteProject(projectId), {
      success: (name) => `Proyek "${name}" dipindahkan ke Sampah (dapat dipulihkan selama 30 hari).`,
      failure: 'Gagal menghapus proyek',
    });
  };

  const duplicateLibraryProject = (projectId) =>
    requireAuthorization(
      () =>
        runCloudTask(() => engine.duplicateProject(projectId), {
          success: (copy) => `Salinan "${copy.name}" ditambahkan ke Library.`,
          failure: 'Gagal menduplikasi proyek',
        }),
      'menduplikasi proyek di Library'
    );

  const restoreProjectRevision = (projectId, revisionId) =>
    requireAuthorization(
      () =>
        runCloudTask(() => engine.restoreRevision(projectId, revisionId), {
          success: 'Snapshot revisi dipulihkan (rollback). Versi sebelumnya dicadangkan otomatis.',
          failure: 'Gagal memulihkan revisi',
        }),
      'memulihkan (rollback) snapshot revisi proyek'
    );

  const createProjectSnapshot = (projectId, customNote = null) =>
    requireAuthorization(
      () =>
        runCloudTask(() => engine.checkpoint(projectId, { note: customNote || undefined }), {
          success: 'Snapshot cadangan berhasil disimpan.',
          failure: 'Gagal membuat snapshot',
        }),
      'membuat snapshot cadangan manual'
    );

  const deleteProjectRevision = (projectId, revisionId) =>
    requireAuthorization(
      () =>
        runCloudTask(() => engine.deleteRevision(projectId, revisionId), {
          success: 'Snapshot revisi dihapus.',
          failure: 'Gagal menghapus snapshot',
        }),
      'menghapus snapshot revisi proyek'
    );

  const loadProjectRevisions = useCallback((projectId) => engine.loadRevisions(projectId), []);
  const ensureProjectSnapshot = useCallback((projectId) => engine.ensureSnapshot(projectId), []);

  const restoreTrashedProject = (projectId) =>
    runCloudTask(() => engine.restoreFromTrash(projectId), {
      success: (name) => `Proyek "${name}" dipulihkan ke Library.`,
      failure: 'Gagal memulihkan proyek',
    });

  const purgeTrashedProject = (projectId) =>
    runCloudTask(() => engine.purgeTrash(projectId), {
      success: 'Proyek dihapus permanen dari Sampah.',
      failure: 'Gagal menghapus permanen',
    });

  /** Mengosongkan area kerja (Proyek Baru). Proyek di Library tidak terpengaruh. */
  const resetProject = () => {
    const draft = activeProject;
    engine.closeDoc({ reset: true });
    setActiveDocId(null);
    // Draf kosong milik perangkat ini tidak perlu ditinggalkan di Library.
    if (draft && draft.status === 'draft' && draft.owner?.id === getClientId() && draft.filledItemsCount === 0 && cloudReady) {
      engine.deleteProject(draft.id).catch(() => {});
    }
    showToast('Area kerja dikosongkan. Proyek yang tersimpan di Library tetap aman.', 'info');
  };

  const exportLibraryBackup = async () => {
    if (library.length === 0) {
      showToast('Library masih kosong, tidak ada data untuk diekspor.', 'info');
      return;
    }
    const data = await runCloudTask(() => engine.exportBackup(), { failure: 'Gagal menyiapkan file backup' });
    if (!data) return;
    downloadJson(`sr-studio-library-backup-${todayIso()}.json`, data);
    showToast(`File backup Library (${data.length} proyek) berhasil diunduh.`, 'success');
  };

  const importLibraryFromJson = (jsonData) =>
    requireAuthorization(async () => {
      let parsed;
      try {
        parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      } catch (error) {
        showToast(`Gagal membaca file JSON: ${error.message}`, 'error');
        return;
      }
      await runCloudTask(() => engine.importBackup(parsed), {
        success: (report) =>
          `Impor selesai: ${report.created.length} proyek baru, ${report.updated.length} diperbarui, ${report.unchanged.length} sudah terbaru.`,
        failure: 'Gagal mengimpor Library',
      });
    }, 'mengimpor file backup ke Library');

  /* ---------------------------------------------------------------- Nilai context */

  const contextValue = {
    // Dokumen kerja
    state,
    subtotal,
    ppnAmount,
    grandTotal,
    filledItemsCount,
    activeLibraryId: activeDocId,
    activeProject,
    isDocLoading,
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
    modalPendingData,
    closePendingModal,
    applyPendingItem,
    applyAllPendingItems,
    dismissPendingItem,
    clearAllPendingItems,
    resetProject,
    // Jadwal
    scheduleConfig: effectiveSchedule,
    updateScheduleDuration,
    updateScheduleStartDate,
    updateCategorySchedule,
    updateActualProgress,
    resetScheduleToDefault,
    // Library
    library,
    saveToLibrary,
    loadFromLibrary,
    deleteFromLibrary,
    duplicateLibraryProject,
    restoreProjectRevision,
    createProjectSnapshot,
    deleteProjectRevision,
    loadProjectRevisions,
    ensureProjectSnapshot,
    restoreTrashedProject,
    purgeTrashedProject,
    exportLibraryBackup,
    importLibraryFromJson,
    // Navigasi & modal
    activeTab,
    setActiveTab,
    saveModalOpen,
    setSaveModalOpen,
    documentModalOpen,
    setDocumentModalOpen,
    scheduleModalOpen,
    setScheduleModalOpen,
    materialTakeoffModalOpen,
    setMaterialTakeoffModalOpen,
    cloudModalOpen,
    setCloudModalOpen,
    toastMessage,
    showToast,
    // Sesi & otorisasi
    sessionRole,
    isMaster,
    canEdit,
    displayName: effectiveName,
    setDisplayName,
    selectSessionRole,
    loginAsMaster,
    logoutToLandingPage,
    unlockedTabs,
    isTabLockedForClient,
    CLIENT_FREE_TABS,
    otpModalData,
    closeOtpModal,
    requireAuthorization,
    redeemOtp,
    // Kompatibilitas komponen lama
    cloudConfig: { isCloudEnabled: true, masterEmail: MASTER_EMAIL, isMasterDevice: isMaster },
  };

  return <BoQContext.Provider value={contextValue}>{children}</BoQContext.Provider>;
}

export function useBoQ() {
  const context = useContext(BoQContext);
  if (!context) throw new Error('useBoQ must be used within a BoQProvider');
  return context;
}
