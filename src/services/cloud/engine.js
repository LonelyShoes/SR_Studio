/**
 * SyncEngine — orkestrator sinkronisasi realtime (tanpa ketergantungan pada React).
 *
 * Tanggung jawab:
 *  - Bootstrap: muat driver → tunggu koneksi → kirim ulang outbox → migrasi data lama → pasang pemantau.
 *  - Sesi dokumen: tiga kanal realtime (BoQ, jadwal, isian kalkulator) untuk dokumen yang dibuka.
 *  - Library: gabungan indeks cloud (realtime) + cache snapshot lokal (IndexedDB) untuk akses offline.
 *  - Persistensi lokal yang konsisten: state & titik-sinkron selalu disimpan bersama (`commit`).
 *
 * UI berlangganan lewat `subscribe` / `getSnapshot` (cocok dengan `useSyncExternalStore`) dan
 * memberi tahu engine setiap state lokal berubah lewat `setLocalBoq` / `setLocalSchedule`.
 */

import { LIMITS, STORAGE_KEYS, WORKSPACE_ROOT } from './config.js';
import { createId, paths } from './keys.js';
import { Outbox, replayOutbox } from './outbox.js';
import { SyncChannel, UNKNOWN_BASE } from './syncChannel.js';
import { WorkspaceClient } from './workspace.js';
import {
  importLegacyProjects,
  isLocalMigrationDone,
  migrateLegacyCloud,
  migrateLocalLibrary,
  readLegacyLocalLibrary,
  releaseLegacyLocalLibrary,
} from './migration.js';
import { applyPatch, mergeRemote, sanitizeTree, treeEqual } from './tree.js';
import {
  buildProjectSummary,
  calcToDoc,
  docToCalc,
  docToSchedule,
  docToState,
  scheduleToDoc,
  stateToDoc,
} from './codec.js';
import { blankState, calcTotals, isMeaningfulState, normalizeLibrary } from '../../utils/normalize.js';

const AUTO_REVISION_KEY = 'sr_studio_auto_revision_at_v3';
const RETRY_DELAYS_MS = [4000, 15000, 60000];

const boqTree = (state) => (state ? sanitizeTree(stateToDoc(state)) : undefined);
const scheduleTree = (schedule) => sanitizeTree(scheduleToDoc(schedule));
const calcTree = (values) => sanitizeTree(calcToDoc(values));

const encodeBase = (channel) => {
  if (!channel.baseKnown) return null;
  return channel.dirty ? { tree: channel.base ?? null } : 'same';
};
const decodeBase = (record, localTree) => {
  if (record === 'same') return localTree;
  if (record && typeof record === 'object' && 'tree' in record) return sanitizeTree(record.tree);
  return UNKNOWN_BASE;
};

const INITIAL_SNAPSHOT = Object.freeze({
  phase: 'starting', // starting | offline | connecting | migrating | syncing | synced | error
  online: false,
  ready: false,
  pending: 0,
  lastSyncedAt: null,
  error: null,
  library: [],
  libraryReady: false,
  trash: [],
  presence: [],
  activity: [],
  otp: undefined, // undefined = belum dimuat dari cloud; null = belum ada kode
  docId: null,
  docLoading: false,
  migration: null,
});

export class SyncEngine {
  /**
   * @param {object} options
   * @param {() => Promise<object>} options.createDriver
   * @param {ReturnType<import('../storage/localStore.js').createLocalStore>} options.store
   * @param {ReturnType<import('../storage/libraryCache.js').createLibraryCache>} options.cache
   * @param {import('../../hooks/usePersistentCalculatorState.js').CalculatorStore} options.calcStore
   * @param {() => { id: string, sessionId: string, name: string, role: string }} options.getIdentity
   * @param {object} options.hooks
   * @param {(updater: (prev: object) => object) => void} options.hooks.applyBoq
   * @param {(updater: (prev: object|null) => object|null) => void} options.hooks.applySchedule
   * @param {(docId: string|null, info: object) => void} options.hooks.onDocChange
   * @param {(text: string, type?: string) => void} options.hooks.notify
   */
  constructor({ createDriver, store, cache, calcStore, getIdentity, hooks, limits = LIMITS, root = WORKSPACE_ROOT }) {
    this.createDriver = createDriver;
    this.root = root;
    this.store = store;
    this.cache = cache;
    this.calcStore = calcStore;
    this.getIdentity = getIdentity;
    this.hooks = hooks;
    this.limits = limits;

    this.outbox = new Outbox({ storage: store.raw, prefix: STORAGE_KEYS.outbox });
    this.snapshot = INITIAL_SNAPSHOT;
    this.listeners = new Set();
    this.emitQueued = false;

    this.driver = null;
    this.workspace = null;
    this.started = false;
    this.disposed = false;
    this.online = false;
    this.ready = false;
    this.bootstrapping = false;
    this.retryCount = 0;
    this.canWrite = false;
    this.creating = false;

    this.session = null;
    this.local = { state: null, schedule: null };
    this.trees = { boq: undefined, schedule: undefined };

    this.cloudEntries = null;
    this.cacheRecords = new Map();
    this.snapshotRequests = new Map();
    this.unsubscribers = [];
    this.trashUnsubscribe = null;
    this.commitTimer = null;
    this.cacheTimer = null;
    this.lastStaleRefreshAt = 0;
  }

  /* ================================================================ Langganan UI */

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  #emit(partial) {
    let changed = false;
    for (const key of Object.keys(partial)) {
      if (this.snapshot[key] !== partial[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.snapshot = { ...this.snapshot, ...partial };
    if (this.emitQueued) return;
    this.emitQueued = true;
    queueMicrotask(() => {
      this.emitQueued = false;
      for (const listener of [...this.listeners]) listener();
    });
  }

  #refreshStatus() {
    const channels = this.session ? Object.values(this.session.channels) : [];
    const pending = this.outbox.size + channels.filter((channel) => channel.canWrite && channel.dirty).length;
    let phase = 'connecting';
    if (this.bootstrapping) phase = 'migrating';
    else if (this.snapshot.phase === 'error' && !this.ready) phase = 'error';
    else if (!this.driver) phase = this.snapshot.phase === 'starting' ? 'starting' : 'offline';
    else if (!this.online) phase = 'offline';
    else if (!this.ready) phase = 'connecting';
    else phase = pending > 0 ? 'syncing' : 'synced';

    const partial = { phase, online: this.online, ready: this.ready, pending };
    if (phase === 'synced' && this.snapshot.phase !== 'synced') partial.lastSyncedAt = Date.now();
    if (phase !== 'error') partial.error = null;
    this.#emit(partial);
  }

  /* ================================================================ Siklus hidup */

  start() {
    if (this.started) return;
    this.started = true;
    this.unsubscribers.push(this.calcStore.onChange(() => this.#onCalcLocalChange()));
    this.unsubscribers.push(this.outbox.subscribe(() => this.#refreshStatus()));
    this.#loadCache();
    this.#initDriver();
  }

  async dispose() {
    this.disposed = true;
    this.commit();
    clearTimeout(this.commitTimer);
    clearTimeout(this.cacheTimer);
    clearTimeout(this.retryTimer);
    clearTimeout(this.reconcileTimer);
    this.#stopSession({ flush: true });
    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe();
    this.trashUnsubscribe?.();
    this.stopPresence?.();
    await this.driver?.close?.().catch(() => {});
  }

  async #loadCache() {
    try {
      const records = await this.cache.loadAll();
      for (const record of records) this.cacheRecords.set(record.id, record);
      if (records.length === 0) {
        // Kunjungan pertama setelah update: jadikan Library lokal versi lama sebagai cache awal.
        const { library } = readLegacyLocalLibrary(this.store.raw);
        for (const project of library) {
          const { stateSnapshot, scheduleSnapshot, calcSnapshot, revisions, ...meta } = project;
          const record = {
            id: project.id,
            meta: { ...meta, status: 'saved', revisionCount: revisions.length },
            stateSnapshot,
            scheduleSnapshot: scheduleSnapshot || null,
            calcSnapshot: calcSnapshot || null,
            revisions,
            snapshotAt: project.updatedAt,
          };
          this.cacheRecords.set(record.id, record);
          await this.cache.put(record);
        }
      }
    } catch (error) {
      console.warn('[SR Studio] Cache Library gagal dimuat:', error);
    }
    this.cacheLoaded = true;
    this.#rebuildLibrary();
    this.#maybeReleaseLegacy();
  }

  async #initDriver() {
    if (this.disposed || this.driver) return;
    try {
      this.driver = await this.createDriver();
    } catch (error) {
      console.warn('[SR Studio] Layanan cloud belum dapat dimuat:', error);
      this.#emit({ phase: 'offline' });
      this.#scheduleRetry(() => this.#initDriver());
      return;
    }
    if (this.disposed) return;
    this.workspace = new WorkspaceClient({
      driver: this.driver,
      outbox: this.outbox,
      getIdentity: this.getIdentity,
      limits: this.limits,
      root: this.root,
    });
    this.workspace.updatePresence({ docId: this.session?.docId || null });
    this.stopPresence = this.workspace.startPresence((online) => this.#onConnection(online));
    this.#refreshStatus();
  }

  #scheduleRetry(task) {
    const delay = RETRY_DELAYS_MS[Math.min(this.retryCount, RETRY_DELAYS_MS.length - 1)];
    this.retryCount += 1;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(task, delay);
  }

  #onConnection(online) {
    this.online = online;
    this.#refreshStatus();
    if (online && !this.ready) this.#bootstrap();
  }

  async #bootstrap() {
    if (this.bootstrapping || this.ready || this.disposed) return;
    this.bootstrapping = true;
    this.#refreshStatus();
    try {
      const replayed = await replayOutbox(this.driver, this.outbox);

      const role = this.getIdentity().role;
      const lastCheck = Number(this.store.getRaw(STORAGE_KEYS.legacyCheckAt)) || 0;
      const recheckDue = role === 'master' && Date.now() - lastCheck > this.limits.legacyRecheckMs;
      let migration = null;
      if (!lastCheck || recheckDue) {
        const result = await migrateLegacyCloud(this.workspace);
        this.store.setRaw(STORAGE_KEYS.legacyCheckAt, String(Date.now()));
        if (!result.skipped) migration = { cloud: result.report };
      }
      if (!isLocalMigrationDone(this.store.raw)) {
        const result = await migrateLocalLibrary(this.workspace, { storage: this.store.raw });
        if (!result.skipped && result.report) migration = { ...migration, local: result.report };
      }
      if (this.disposed) return;

      this.#startWatchers();
      this.ready = true;
      this.retryCount = 0;
      if (migration) this.#emit({ migration });
      this.#maybeReleaseLegacy();

      this.#connectSession();
      this.#maybeAutoCreate();

      // Ringkasan proyek yang patch-nya baru terkirim ulang dihitung lagi (totalnya mungkin basi).
      for (const docId of replayed.docIds) {
        if (docId !== this.session?.docId) this.workspace.recomputeSummary(docId).catch(() => {});
      }
      if (role === 'master') this.workspace.pruneActivity().catch(() => {});
    } catch (error) {
      console.error('[SR Studio] Bootstrap sinkronisasi gagal:', error);
      this.#emit({ phase: 'error', error: error?.message || String(error) });
      if (this.online) this.#scheduleRetry(() => this.#bootstrap());
    } finally {
      this.bootstrapping = false;
      this.#refreshStatus();
    }
  }

  #startWatchers() {
    const onError = (error) => {
      console.error('[SR Studio] Pemantau realtime terputus:', error);
      this.#emit({ error: error?.message || String(error) });
    };
    this.unsubscribers.push(
      this.workspace.watchProjects((entries) => {
        this.cloudEntries = new Map(entries.map((entry) => [entry.id, entry]));
        this.#pruneCache();
        this.#rebuildLibrary();
        this.#emit({ libraryReady: true });
        this.#scheduleSummaryReconcile();
      }, onError),
      this.workspace.watchPresence((presence) => this.#emit({ presence }), onError),
      this.workspace.watchActivity((activity) => this.#emit({ activity }), onError),
      this.workspace.watchOtp((otp) => this.#emit({ otp }), onError)
    );
    this.syncRoleWatchers();
  }

  /** Pemantau khusus Master (sampah). Dipanggil ulang saat peran berubah. */
  syncRoleWatchers() {
    if (!this.workspace || !this.started) return;
    const isMaster = this.getIdentity().role === 'master';
    if (isMaster && !this.trashUnsubscribe && (this.ready || this.bootstrapping)) {
      let swept = false;
      this.trashUnsubscribe = this.workspace.watchTrash((trash) => {
        this.#emit({ trash });
        if (!swept) {
          swept = true;
          this.workspace.sweepTrash(trash).catch(() => {});
        }
      });
    } else if (!isMaster && this.trashUnsubscribe) {
      this.trashUnsubscribe();
      this.trashUnsubscribe = null;
      this.#emit({ trash: [] });
    }
  }

  /** Dipanggil saat nama/peran pengguna berubah. */
  identityChanged() {
    const { name, role } = this.getIdentity();
    this.workspace?.updatePresence({ name, role });
    this.syncRoleWatchers();
  }

  setPresence(fields) {
    this.workspace?.updatePresence(fields);
  }

  /* ================================================================ Library & cache */

  #rebuildLibrary() {
    const metas = this.cloudEntries
      ? [...this.cloudEntries.values()]
      : [...this.cacheRecords.values()].map((record) => record.meta).filter(Boolean);
    const library = metas.map((meta) => {
      const cached = this.cacheRecords.get(meta.id);
      return {
        ...meta,
        status: meta.status || 'saved',
        revisionCount: meta.revisionCount ?? cached?.revisions?.length ?? 0,
        stateSnapshot: cached?.stateSnapshot || null,
        scheduleSnapshot: cached?.scheduleSnapshot || null,
        calcSnapshot: cached?.calcSnapshot || null,
        revisions: cached?.revisions || [],
        snapshotStale: !cached?.stateSnapshot || cached.snapshotAt !== meta.updatedAt,
      };
    });
    library.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    this.#emit({ library });
  }

  /** Proyek yang sudah tidak ada di cloud (dihapus perangkat lain) dilepas dari cache. */
  #pruneCache() {
    for (const id of [...this.cacheRecords.keys()]) {
      if (!this.cloudEntries.has(id)) {
        this.cacheRecords.delete(id);
        this.cache.remove(id);
      }
    }
  }

  #maybeReleaseLegacy() {
    if (this.cacheLoaded && isLocalMigrationDone(this.store.raw)) releaseLegacyLocalLibrary(this.store.raw);
  }

  #putCache(id, fields) {
    const meta = this.cloudEntries?.get(id) || this.cacheRecords.get(id)?.meta;
    if (!meta) return;
    const record = { ...this.cacheRecords.get(id), id, meta, ...fields };
    this.cacheRecords.set(id, record);
    this.cache.put(record);
    this.#rebuildLibrary();
  }

  /** Memastikan snapshot proyek tersedia & terbaru. Saat offline mengembalikan cache yang ada. */
  async ensureSnapshot(id, { force = false } = {}) {
    const cached = this.cacheRecords.get(id);
    const meta = this.cloudEntries?.get(id);
    const fresh = cached?.stateSnapshot && meta && cached.snapshotAt === meta.updatedAt;
    if ((fresh && !force) || !this.ready || !meta) return cached || null;
    if (this.snapshotRequests.has(id)) return this.snapshotRequests.get(id);

    const request = (async () => {
      try {
        const snapshot = await this.workspace.readProjectSnapshot(id);
        if (snapshot) this.#putCache(id, { ...snapshot, snapshotAt: meta.updatedAt });
      } catch (error) {
        console.warn(`[SR Studio] Snapshot proyek ${id} belum dapat dimuat:`, error?.message || error);
      } finally {
        this.snapshotRequests.delete(id);
      }
      return this.cacheRecords.get(id) || null;
    })();
    this.snapshotRequests.set(id, request);
    return request;
  }

  /** Menyegarkan snapshot yang basi (dipanggil saat tab Library dibuka). */
  async refreshStaleSnapshots({ minIntervalMs = 60000 } = {}) {
    if (!this.ready || !this.online || Date.now() - this.lastStaleRefreshAt < minIntervalMs) return;
    this.lastStaleRefreshAt = Date.now();
    for (const entry of this.snapshot.library) {
      if (entry.snapshotStale && entry.id !== this.session?.docId) await this.ensureSnapshot(entry.id);
    }
  }

  async loadRevisions(id) {
    this.#requireReady();
    const revisions = await this.workspace.loadRevisions(id);
    this.#putCache(id, { revisions });
    const meta = this.cloudEntries?.get(id);
    if (meta && meta.revisionCount !== revisions.length && this.canWrite) {
      this.workspace.updateProjectFields(id, { revisionCount: revisions.length }).catch(() => {});
    }
    return revisions;
  }

  #requireReady() {
    if (!this.ready || !this.workspace) throw new Error('Cloud belum terhubung. Periksa koneksi internet lalu coba lagi.');
  }

  /* ================================================================ State lokal */

  /**
   * @param {object} state State BoQ terbaru dari UI.
   * @param {string|null} docId Dokumen yang dimaksud render tersebut. Panggilan dari render
   *   lama (dokumen sudah berganti) diabaikan agar isi dokumen lain tidak ikut terkirim.
   */
  setLocalBoq(state, docId) {
    if ((docId || null) !== (this.session?.docId || null)) return;
    if (this.session?.loading) return;
    this.local.state = state;
    this.trees.boq = boqTree(state);
    this.session?.channels.boq.setLocal(this.trees.boq);
    this.#scheduleCommit();
    this.#maybeAutoCreate();
  }

  setLocalSchedule(schedule, docId) {
    if ((docId || null) !== (this.session?.docId || null)) return;
    this.local.schedule = schedule || null;
    this.trees.schedule = scheduleTree(schedule);
    this.session?.channels.schedule.setLocal(this.trees.schedule);
    this.#scheduleCommit();
  }

  #onCalcLocalChange() {
    this.session?.channels.calc.setLocal(calcTree(this.calcStore.syncSnapshot()));
    this.#scheduleCommit();
  }

  setCanWrite(canWrite) {
    if (this.canWrite === canWrite) return;
    this.canWrite = canWrite;
    if (this.session) for (const channel of Object.values(this.session.channels)) channel.setCanWrite(canWrite);
    this.#refreshStatus();
    this.#maybeAutoCreate();
  }

  #scheduleCommit() {
    clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => this.commit(), 250);
    this.#refreshStatus();
  }

  /**
   * Menyerahkan perubahan ke server lalu menyimpan state lokal + titik sinkron ke perangkat.
   * State selalu ditulis lebih dulu daripada titik sinkron: bila tab mati di tengah jalan,
   * perubahan paling buruk dikirim ulang — tidak pernah membatalkan perubahan orang lain.
   */
  commit() {
    clearTimeout(this.commitTimer);
    const session = this.session;
    if (session?.loading) return;
    if (session) for (const channel of Object.values(session.channels)) channel.flush();

    if (this.local.state) this.store.set(STORAGE_KEYS.boqState, this.local.state);
    if (this.local.schedule) this.store.set(STORAGE_KEYS.schedule, this.local.schedule);
    else this.store.remove(STORAGE_KEYS.schedule);
    this.calcStore.persist();

    if (session) {
      this.store.setRaw(STORAGE_KEYS.activeDocId, session.docId);
      this.store.set(STORAGE_KEYS.syncBase, {
        docId: session.docId,
        boq: encodeBase(session.channels.boq),
        schedule: encodeBase(session.channels.schedule),
        calc: encodeBase(session.channels.calc),
      });
      this.#scheduleActiveCache();
    } else {
      this.store.remove(STORAGE_KEYS.activeDocId);
      this.store.remove(STORAGE_KEYS.syncBase);
    }
    this.#refreshStatus();
  }

  #scheduleActiveCache() {
    if (this.cacheTimer) return;
    this.cacheTimer = setTimeout(() => {
      this.cacheTimer = null;
      this.#cacheActiveDoc();
    }, 5000);
  }

  #cacheActiveDoc() {
    const session = this.session;
    if (!session || session.loading || !this.local.state) return;
    const meta = this.cloudEntries?.get(session.docId);
    this.#putCache(session.docId, {
      stateSnapshot: this.local.state,
      scheduleSnapshot: this.local.schedule,
      calcSnapshot: this.calcStore.syncSnapshot(),
      snapshotAt: meta?.updatedAt || null,
    });
  }

  /* ================================================================ Sesi dokumen */

  /**
   * Melanjutkan dokumen yang terbuka pada kunjungan sebelumnya (dipanggil sekali saat start).
   * Bila perangkat ini belum punya titik sinkron untuk dokumen itu (update dari versi lama),
   * salinan lokal diverifikasi dulu terhadap cloud sebelum boleh menulis.
   */
  resume(docId, { state, schedule }) {
    if (this.resumed) return; // aman terhadap render ganda (StrictMode) & HMR
    this.resumed = true;
    this.local = { state, schedule: schedule || null };
    this.trees = { boq: boqTree(state), schedule: scheduleTree(schedule) };
    if (!docId) return;
    const record = this.store.get(STORAGE_KEYS.syncBase);
    const known = record && record.docId === docId;
    const boqBase = known ? decodeBase(record.boq, this.trees.boq) : UNKNOWN_BASE;
    this.#startSession(docId, {
      bases: {
        boq: boqBase,
        schedule: known ? decodeBase(record.schedule, this.trees.schedule) : UNKNOWN_BASE,
        calc: known ? decodeBase(record.calc, calcTree(this.calcStore.syncSnapshot())) : UNKNOWN_BASE,
      },
      // Titik sinkron belum pernah dipastikan (update dari versi lama, atau verifikasi sesi
      // sebelumnya belum selesai) → salinan lokal wajib diverifikasi, tidak boleh langsung ditimpa.
      verify: boqBase === UNKNOWN_BASE,
    });
  }

  /** Membuka proyek dari Library. Tampil instan dari cache bila ada, lalu mengikuti data live. */
  openProject(docId) {
    if (this.session?.docId === docId) return;
    this.commit();
    this.#cacheActiveDoc();
    this.#stopSession({ flush: true });

    const cached = this.cacheRecords.get(docId);
    const state = cached?.stateSnapshot || null;
    const schedule = cached?.scheduleSnapshot || null;
    this.calcStore.setScope(docId);
    this.local = { state, schedule };
    this.trees = { boq: boqTree(state), schedule: scheduleTree(schedule) };

    this.#startSession(docId, {
      bases: {
        boq: state ? this.trees.boq : UNKNOWN_BASE,
        schedule: state ? this.trees.schedule : UNKNOWN_BASE,
        calc: UNKNOWN_BASE,
      },
      loading: !state,
    });
    this.hooks.onDocChange(docId, { reason: 'open', state, schedule, loading: !state });
    this.commit();
  }

  /** Melepas dokumen aktif. `reset: true` mengosongkan area kerja (Proyek Baru). */
  closeDoc({ reset = false } = {}) {
    this.commit();
    this.#cacheActiveDoc();
    this.#stopSession({ flush: true });
    if (reset) {
      this.calcStore.setScope(null);
      for (const key of Object.keys(this.calcStore.snapshot())) this.calcStore.set(key, undefined);
      this.calcStore.persist();
      this.#resetLocal();
    } else {
      this.calcStore.renameScope(null);
    }
    this.hooks.onDocChange(null, { reason: reset ? 'reset' : 'detach' });
    this.commit();
  }

  /**
   * Mengosongkan area kerja lokal. State kosong langsung menjadi cermin engine sehingga
   * `commit()` berikutnya menyimpannya — isi dokumen lama tidak pernah tertinggal di perangkat
   * sebagai "pekerjaan tanpa dokumen" (yang akan dijadikan draf baru saat aplikasi dibuka lagi).
   */
  #resetLocal() {
    const state = blankState();
    this.local = { state, schedule: null };
    this.trees = { boq: boqTree(state), schedule: undefined };
  }

  #abs(relative) {
    return `${this.root}/${relative}`;
  }

  /**
   * Membuat sesi dokumen. Selalu sinkron — kanal dibuat walau driver belum siap, sehingga
   * perubahan lokal sejak awal dilacak terhadap titik sinkron dan dikirim saat tersambung.
   */
  #startSession(docId, { bases, verify = false, loading = false }) {
    const session = { docId, verify, loading, channels: {} };
    const projectPath = this.#abs(paths.project(docId));
    const common = {
      outbox: this.outbox,
      outboxMeta: { docId },
      onStateChange: () => this.#refreshStatus(),
      onError: (error) => this.#onWriteError(error),
    };
    const noteEdit = (kind, patch) => {
      const name = this.cloudEntries?.get(docId)?.name || this.local.state?.project?.name || 'Proyek';
      this.workspace.noteEdit(docId, name, kind, Object.keys(patch).length);
    };
    const touch = () => ({
      [`${projectPath}/updatedAt`]: this.driver.timestamp,
      [`${projectPath}/updatedBy`]: this.workspace.who(),
    });

    session.channels.boq = new SyncChannel({
      ...common,
      path: this.#abs(paths.boq(docId)),
      missingMeansDeleted: true,
      resolveInitial: verify ? (remote, local) => this.#verifyLocalCopy(docId, remote, local) : undefined,
      decorate: (_patch, local) => this.#boqMetaPatch(docId, local),
      onBeforeWrite: ({ first, base, patch }) => {
        if (first) this.#autoCheckpoint(docId, base);
        noteEdit('boq', patch);
      },
      onRemote: (event) => this.#onBoqRemote(session, event),
    }).init({ base: bases.boq, local: this.trees.boq, canWrite: this.canWrite });

    session.channels.schedule = new SyncChannel({
      ...common,
      path: this.#abs(paths.schedule(docId)),
      // Cloud belum punya jadwal → jadwal lokal (bila ada) menjadi perubahan tertunda.
      resolveInitial: (remote, local) => (remote === undefined ? { base: undefined, local } : { base: remote, local: remote }),
      decorate: touch,
      onBeforeWrite: ({ patch }) => noteEdit('schedule', patch),
      onRemote: (event) => this.#onScheduleRemote(session, event),
    }).init({ base: bases.schedule, local: this.trees.schedule, canWrite: this.canWrite });

    session.channels.calc = new SyncChannel({
      ...common,
      path: this.#abs(paths.calc(docId)),
      // Gabungan: nilai cloud menang pada kunci yang sama, isian lokal lain ikut diunggah.
      resolveInitial: (remote, local) => {
        const localOnly = {};
        for (const key of Object.keys(local || {})) if (!remote || !(key in remote)) localOnly[key] = local[key];
        return { base: remote, local: applyPatch(remote, localOnly) };
      },
      decorate: touch,
      onBeforeWrite: ({ patch }) => noteEdit('calc', patch),
      onRemote: (event) => {
        if (this.session !== session || event.kind === 'deleted' || event.kind === 'diverged') return;
        this.calcStore.replaceSynced(docToCalc(event.local));
        this.#scheduleCommit();
      },
    }).init({ base: bases.calc, local: calcTree(this.calcStore.syncSnapshot()), canWrite: this.canWrite });

    this.session = session;
    this.workspace?.updatePresence({ docId });
    this.#emit({ docId, docLoading: loading });
    this.#connectSession();
  }

  #connectSession() {
    if (!this.session || !this.ready) return;
    for (const channel of Object.values(this.session.channels)) channel.connect(this.driver);
    this.#refreshStatus();
  }

  #stopSession({ flush }) {
    const session = this.session;
    if (!session) return;
    for (const channel of Object.values(session.channels)) channel.stop({ flush });
    this.session = null;
    this.workspace?.updatePresence({ docId: null });
    this.#emit({ docId: null, docLoading: false });
    this.#refreshStatus();
  }

  /** Metadata proyek yang ikut ditulis bersama setiap perubahan BoQ. */
  #boqMetaPatch(docId, localTree) {
    const base = this.#abs(paths.project(docId));
    const patch = {
      [`${base}/updatedAt`]: this.driver.timestamp,
      [`${base}/updatedBy`]: this.workspace.who(),
    };
    const summary = buildProjectSummary(docToState(localTree));
    const known = this.cloudEntries?.get(docId);
    for (const key of Object.keys(summary)) {
      if (!known || known[key] !== summary[key]) patch[`${base}/${key}`] = summary[key];
    }
    return patch;
  }

  /**
   * Verifikasi salinan kerja lokal dari versi lama terhadap dokumen cloud.
   * @returns keputusan kanal, atau `null` bila salinan lokal berisi perubahan yang belum
   *   pernah disimpan (tidak digabung otomatis; dijadikan draf terpisah oleh pemanggil).
   */
  #verifyLocalCopy(docId, remote, local) {
    if (treeEqual(local, remote)) return { base: remote, local: remote };
    const cachedTree = boqTree(this.cacheRecords.get(docId)?.stateSnapshot);
    if (cachedTree && treeEqual(local, cachedTree)) return { base: remote, local: remote };
    return null;
  }

  #onBoqRemote(session, event) {
    if (this.session !== session) return;

    if (event.kind === 'deleted' || event.kind === 'diverged') {
      const keepLocal = event.kind === 'diverged' || session.verify;
      const name = this.cloudEntries?.get(session.docId)?.name || this.local.state?.project?.name || '';
      this.#stopSession({ flush: false });
      if (keepLocal) {
        this.calcStore.renameScope(null);
      } else {
        this.calcStore.setScope(null);
        this.#resetLocal();
      }
      this.hooks.onDocChange(null, { reason: event.kind, keepLocal, name });
      this.commit();
      if (keepLocal) this.#maybeAutoCreate();
      return;
    }

    if (event.kind === 'initial') {
      const wasLoading = session.loading;
      session.loading = false;
      session.verify = false;
      this.trees.boq = event.local;
      this.hooks.applyBoq((prev) => {
        const next = docToState(event.local, prev);
        next.project.libraryId = session.docId;
        return wasLoading || !treeEqual(boqTree(prev), event.local) ? next : prev;
      });
      this.#emit({ docLoading: false });
    } else {
      // Gabung terhadap state React TERBARU (bukan cermin engine) agar ketikan yang belum
      // sempat dicerminkan tidak tertimpa.
      this.hooks.applyBoq((prev) => {
        const prevTree = boqTree(prev);
        const merged = mergeRemote(event.oldBase, prevTree, event.remote);
        if (treeEqual(merged, prevTree)) return prev;
        const next = docToState(merged, prev);
        next.project.libraryId = session.docId;
        return next;
      });
    }
    this.#scheduleCommit();
  }

  #onScheduleRemote(session, event) {
    if (this.session !== session || event.kind === 'deleted' || event.kind === 'diverged') return;
    if (event.kind === 'initial') {
      this.trees.schedule = event.local;
      this.hooks.applySchedule((prev) => (treeEqual(scheduleTree(prev), event.local) ? prev : docToSchedule(event.local)));
    } else {
      this.hooks.applySchedule((prev) => {
        const prevTree = scheduleTree(prev);
        const merged = mergeRemote(event.oldBase, prevTree, event.remote);
        return treeEqual(merged, prevTree) ? prev : docToSchedule(merged);
      });
    }
    this.#scheduleCommit();
  }

  #onWriteError(error) {
    console.error('[SR Studio] Perubahan ditolak server:', error);
    const now = Date.now();
    if (now - (this.lastWriteErrorAt || 0) > 10000) {
      this.lastWriteErrorAt = now;
      this.hooks.notify('Sebagian perubahan ditolak server dan dikembalikan ke data cloud.', 'error');
    }
    this.#refreshStatus();
  }

  /** Cadangan otomatis keadaan sebelum sesi edit (maks. sekali per 6 jam per proyek per perangkat). */
  #autoCheckpoint(docId, baseTree) {
    const entry = this.cloudEntries?.get(docId);
    if (!baseTree || !entry || entry.status === 'draft') return;
    const history = this.store.get(AUTO_REVISION_KEY, {}) || {};
    const now = Date.now();
    if (now - (Number(history[docId]) || 0) < this.limits.autoRevisionMinGapMs) return;
    history[docId] = now;
    this.store.set(AUTO_REVISION_KEY, history);

    const state = docToState(baseTree);
    this.workspace
      .addRevision(
        docId,
        {
          timestamp: Date.parse(entry.updatedAt) || now,
          note: `Otomatis: sebelum sesi edit oleh ${this.getIdentity().name}`,
          ...calcTotals(state),
          stateSnapshot: state,
          scheduleSnapshot: this.cacheRecords.get(docId)?.scheduleSnapshot || null,
        },
        { auto: true }
      )
      .catch((error) => console.warn('[SR Studio] Cadangan otomatis gagal dibuat:', error));
  }

  /**
   * Menyamakan ringkasan di daftar Library dengan isi dokumen aktif bila dua editor
   * menulis total hampir bersamaan (yang terakhir menulis bisa membawa total basi).
   */
  #scheduleSummaryReconcile() {
    clearTimeout(this.reconcileTimer);
    this.reconcileTimer = setTimeout(() => {
      const session = this.session;
      if (!session || !this.canWrite || !this.ready || session.loading || !this.local.state) return;
      if (Object.values(session.channels).some((channel) => channel.pending)) return;
      this.workspace.reconcileSummary(session.docId, this.local.state, this.cloudEntries?.get(session.docId))?.catch(() => {});
    }, 2500);
  }

  /* ================================================================ Membuat dokumen */

  /** Area kerja lokal yang berisi & belum punya dokumen cloud otomatis dijadikan draf realtime. */
  #maybeAutoCreate() {
    if (!this.ready || this.session || this.creating || !this.canWrite) return;
    if (!isMeaningfulState(this.local.state)) return;
    this.createFromLocal({ status: 'draft' });
  }

  /**
   * Membuat dokumen cloud dari area kerja lokal lalu langsung menyunting dokumen tersebut.
   * @returns {string|null} id dokumen baru
   */
  createFromLocal({ status = 'saved', name } = {}) {
    this.#requireReady();
    if (this.session) throw new Error('Area kerja sudah terhubung ke dokumen cloud.');
    this.creating = true;
    try {
      let state = this.local.state || blankState();
      if (name && name !== state.project?.name) {
        state = { ...state, project: { ...state.project, name } };
      }
      const docId = createId('proj');
      this.calcStore.renameScope(docId);
      const calcValues = this.calcStore.syncSnapshot();
      const created = this.workspace.createProject({ id: docId, state, schedule: this.local.schedule, calc: calcValues, status });
      created.done.catch((error) => this.#onWriteError(error));

      this.local.state = state;
      this.trees.boq = boqTree(state);
      this.#startSession(docId, {
        bases: { boq: created.boq, schedule: this.trees.schedule, calc: calcTree(calcValues) },
      });
      this.workspace.logActivity({
        type: status === 'draft' ? 'draft.create' : 'project.create',
        projectId: docId,
        projectName: buildProjectSummary(state).name,
      });
      this.hooks.onDocChange(docId, { reason: 'create', status, name: name || null });
      this.commit();
      return docId;
    } finally {
      this.creating = false;
    }
  }

  /* ================================================================ Operasi Library */

  #activeBundle() {
    return {
      boq: this.trees.boq,
      schedule: this.trees.schedule,
      calc: calcTree(this.calcStore.syncSnapshot()),
    };
  }

  #entryName(id) {
    return this.cloudEntries?.get(id)?.name || this.cacheRecords.get(id)?.meta?.name || 'Proyek';
  }

  /** Menyimpan titik versi (checkpoint) dari proyek. Untuk proyek aktif memakai state lokal. */
  async checkpoint(docId, { note, auto = false } = {}) {
    this.#requireReady();
    let state;
    let schedule;
    if (docId === this.session?.docId) {
      this.commit();
      state = this.local.state;
      schedule = this.local.schedule;
    } else {
      const snapshot = await this.workspace.readProjectSnapshot(docId);
      if (!snapshot) throw new Error('Dokumen proyek tidak ditemukan di cloud.');
      state = snapshot.stateSnapshot;
      schedule = snapshot.scheduleSnapshot;
    }
    const totals = calcTotals(state);
    await this.workspace.addRevision(
      docId,
      {
        timestamp: this.driver.now(),
        note: note || `Versi tersimpan (${totals.filledItemsCount} item terisi)`,
        ...totals,
        stateSnapshot: state,
        scheduleSnapshot: schedule,
      },
      { auto }
    );
    if (!auto) this.workspace.logActivity({ type: 'project.checkpoint', projectId: docId, projectName: this.#entryName(docId), detail: note || null });
    if (this.cacheRecords.get(docId)?.revisions) this.loadRevisions(docId).catch(() => {});
  }

  /** Draf → proyek tersimpan di Library (id tetap, tidak ada penyalinan). */
  async promoteDraft(docId, { note } = {}) {
    this.#requireReady();
    await this.workspace.updateProjectFields(docId, { status: 'saved', updatedAt: this.driver.timestamp, updatedBy: this.workspace.who() });
    this.workspace.logActivity({ type: 'project.create', projectId: docId, projectName: this.#entryName(docId) });
    await this.checkpoint(docId, { note: note || 'Versi awal disimpan ke Library', auto: true }).catch(() => {});
  }

  /** Menyimpan area kerja sebagai proyek baru (salinan) dan berpindah ke proyek itu. */
  async saveAsNew({ name }) {
    this.#requireReady();
    this.commit();
    const bundle = this.#activeBundle();
    if (!bundle.boq) throw new Error('Tidak ada data RAB untuk disalin.');
    const copy = await this.workspace.duplicateProject(this.session?.docId, { name, bundle });
    copy.done.catch((error) => this.#onWriteError(error));
    this.workspace.logActivity({ type: 'project.create', projectId: copy.id, projectName: name });
    this.#adoptCreated(copy);
    return copy.id;
  }

  /** Berpindah ke dokumen yang baru saja kita buat (isinya sudah diketahui). */
  #adoptCreated({ id, state, schedule, calc }) {
    this.#cacheActiveDoc();
    this.#stopSession({ flush: true });
    this.calcStore.setScope(id);
    this.calcStore.replaceSynced(calc || {});
    this.local = { state, schedule: schedule || null };
    this.trees = { boq: boqTree(state), schedule: scheduleTree(schedule) };
    this.#startSession(id, {
      bases: { boq: this.trees.boq, schedule: this.trees.schedule, calc: calcTree(calc || {}) },
    });
    this.hooks.onDocChange(id, { reason: 'open', state, schedule: schedule || null, loading: false });
    this.commit();
  }

  /**
   * Menimpa isi proyek `targetId` dengan area kerja saat ini (alur lama "Perbarui proyek di
   * Library" dari sebuah draf). Versi sebelumnya dicadangkan; draf sumber dilepas.
   */
  async mergeIntoProject(targetId, { note } = {}) {
    this.#requireReady();
    this.commit();
    const sourceId = this.session?.docId || null;
    const sourceEntry = sourceId ? this.cloudEntries?.get(sourceId) : null;
    const state = this.local.state;
    const schedule = this.local.schedule;
    if (!state) throw new Error('Tidak ada data RAB untuk disimpan.');

    const current = await this.workspace.readProjectSnapshot(targetId);
    if (current) {
      await this.workspace.addRevision(
        targetId,
        {
          timestamp: Date.parse(this.cloudEntries?.get(targetId)?.updatedAt) || this.driver.now(),
          note: note || 'Versi sebelum diperbarui dari draf',
          ...calcTotals(current.stateSnapshot),
          stateSnapshot: current.stateSnapshot,
          scheduleSnapshot: current.scheduleSnapshot,
        },
        { auto: false }
      );
    }
    await this.workspace.replaceDoc(targetId, { state, schedule: schedule || undefined });
    this.workspace.logActivity({ type: 'project.update', projectId: targetId, projectName: this.#entryName(targetId), detail: note || null });

    this.#stopSession({ flush: true });
    if (sourceEntry?.status === 'draft') {
      // Draf sumber sudah melebur ke proyek tujuan → dilepas tanpa masuk sampah.
      await this.driver.write({
        [this.workspace.abs(paths.project(sourceId))]: null,
        [this.workspace.abs(paths.doc(sourceId))]: null,
      });
    }
    this.calcStore.renameScope(targetId);
    this.openProject(targetId);
  }

  async duplicateProject(docId) {
    this.#requireReady();
    const name = `${this.#entryName(docId)} (Salinan)`;
    const isActive = docId === this.session?.docId;
    if (isActive) this.commit();
    const copy = await this.workspace.duplicateProject(docId, { name, bundle: isActive ? this.#activeBundle() : undefined });
    await copy.done;
    this.workspace.logActivity({ type: 'project.duplicate', projectId: copy.id, projectName: name });
    return { id: copy.id, name };
  }

  async deleteProject(docId) {
    this.#requireReady();
    const name = this.#entryName(docId);
    if (docId === this.session?.docId) this.closeDoc({ reset: true });
    await this.workspace.deleteProject(docId);
    this.workspace.logActivity({ type: 'project.delete', projectId: docId, projectName: name });
    this.cacheRecords.delete(docId);
    this.cache.remove(docId);
    return name;
  }

  async restoreFromTrash(docId) {
    this.#requireReady();
    const name = await this.workspace.restoreFromTrash(docId);
    this.workspace.logActivity({ type: 'project.restore', projectId: docId, projectName: name });
    return name;
  }

  async purgeTrash(docId) {
    this.#requireReady();
    await this.workspace.purgeTrash(docId);
  }

  /** Memulihkan proyek ke salah satu revisi. Versi saat ini dicadangkan lebih dulu. */
  async restoreRevision(docId, revisionId) {
    this.#requireReady();
    const revisions = this.cacheRecords.get(docId)?.revisions?.some((revision) => revision.id === revisionId && revision.stateSnapshot)
      ? this.cacheRecords.get(docId).revisions
      : await this.loadRevisions(docId);
    const target = revisions.find((revision) => revision.id === revisionId);
    if (!target?.stateSnapshot) throw new Error('Snapshot revisi tidak ditemukan atau rusak.');

    await this.checkpoint(docId, {
      note: `Versi sebelum rollback ke revisi ${new Date(target.timestamp).toLocaleDateString('id-ID')}`,
      auto: true,
    });

    if (docId === this.session?.docId) {
      this.hooks.applyBoq((prev) => {
        const next = docToState(boqTree(target.stateSnapshot), prev);
        next.project.libraryId = docId;
        return next;
      });
      if (target.scheduleSnapshot) this.hooks.applySchedule(() => target.scheduleSnapshot);
    } else {
      await this.workspace.replaceDoc(docId, { state: target.stateSnapshot, schedule: target.scheduleSnapshot || undefined });
      this.openProject(docId);
    }
    this.workspace.logActivity({ type: 'revision.restore', projectId: docId, projectName: this.#entryName(docId), detail: target.note || null });
    this.loadRevisions(docId).catch(() => {});
  }

  async deleteRevision(docId, revisionId) {
    this.#requireReady();
    await this.workspace.deleteRevision(docId, revisionId);
    await this.loadRevisions(docId).catch(() => {});
  }

  /** Seluruh Library dalam format file backup (kompatibel dengan versi lama). */
  async exportBackup() {
    const out = [];
    for (const entry of this.snapshot.library) {
      const isActive = entry.id === this.session?.docId;
      if (!isActive) await this.ensureSnapshot(entry.id);
      let revisions = this.cacheRecords.get(entry.id)?.revisions || [];
      if (this.ready && this.online) revisions = await this.loadRevisions(entry.id).catch(() => revisions);
      const record = this.cacheRecords.get(entry.id) || {};
      const { snapshotStale, ...meta } = entry;
      void snapshotStale;
      out.push({
        ...meta,
        stateSnapshot: isActive ? this.local.state : record.stateSnapshot || null,
        scheduleSnapshot: isActive ? this.local.schedule : record.scheduleSnapshot || null,
        calcSnapshot: isActive ? this.calcStore.syncSnapshot() : record.calcSnapshot || null,
        revisions,
      });
    }
    return out;
  }

  /** Impor file backup: proyek baru dibuat, versi yang lebih baru memperbarui cloud. */
  async importBackup(data) {
    this.#requireReady();
    const projects = normalizeLibrary(Array.isArray(data) ? data : data?.library || data);
    if (projects.length === 0) throw new Error('Format file tidak valid: tidak ada daftar proyek Library.');
    const report = await importLegacyProjects(this.workspace, projects, { source: 'file backup', respectTombstones: false });
    this.workspace.logActivity({ type: 'library.import', detail: `${report.created.length} baru, ${report.updated.length} diperbarui` });
    return report;
  }

  /* ================================================================ OTP */

  issueOtp() {
    this.#requireReady();
    return this.workspace.issueOtp();
  }

  async redeemOtp(code, purpose) {
    if (!this.ready || !this.workspace) {
      return { success: false, message: 'Verifikasi OTP membutuhkan koneksi internet.' };
    }
    const result = await this.workspace.redeemOtp(code, purpose);
    if (result.success) this.workspace.logActivity({ type: 'otp.redeem', detail: purpose || null });
    return result;
  }
}
