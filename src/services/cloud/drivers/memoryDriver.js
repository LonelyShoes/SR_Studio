/**
 * Driver memori: tiruan Firebase Realtime Database untuk pengujian.
 *
 * `MemoryServer` memegang satu pohon data; setiap `server.connect()` adalah satu "perangkat"
 * dengan antrian tulis sendiri. `client.setOnline(false)` mensimulasikan putus jaringan:
 * tulisan ditahan (tetap terlihat secara optimistis di perangkat itu) dan dikirim berurutan
 * saat tersambung lagi — sama seperti perilaku SDK asli.
 */

import { applyPatch, isPlainObject, sanitizeTree, treeEqual } from '../tree.js';
import { SERVER_TIMESTAMP } from './firebaseDriver.js';

const valueAt = (tree, path) => {
  let node = tree;
  for (const segment of path.split('/')) {
    if (!isPlainObject(node)) return undefined;
    node = node[segment];
  }
  return node;
};

const isServerTimestamp = (value) => isPlainObject(value) && value['.sv'] === 'timestamp';

function resolveServerValues(value, now) {
  if (isServerTimestamp(value)) return now;
  if (!isPlainObject(value)) return value;
  const out = {};
  for (const key of Object.keys(value)) out[key] = resolveServerValues(value[key], now);
  return out;
}

function lastKeys(value, limit) {
  if (!isPlainObject(value)) return value;
  const out = {};
  for (const key of Object.keys(value).sort().slice(-limit)) out[key] = value[key];
  return out;
}

export class MemoryServer {
  constructor(initialTree) {
    this.tree = sanitizeTree(initialTree);
    this.clients = new Set();
    this.clock = 1_700_000_000_000;
    this.idCounter = 0;
    /** Bila diisi, `write` yang menyentuh path berawalan ini ditolak (simulasi rules). */
    this.denyPrefix = null;
  }

  now() {
    this.clock += 1;
    return this.clock;
  }

  apply(patch) {
    if (this.denyPrefix && Object.keys(patch).some((path) => path.startsWith(this.denyPrefix))) {
      throw new Error('PERMISSION_DENIED');
    }
    const now = this.now();
    const resolved = {};
    for (const path of Object.keys(patch)) {
      const value = resolveServerValues(patch[path], now);
      resolved[path] = value === null || value === undefined ? null : sanitizeTree(value) ?? null;
    }
    this.tree = applyPatch(this.tree, resolved);
    for (const client of this.clients) client.notify();
  }

  connect() {
    const client = new MemoryClient(this);
    this.clients.add(client);
    return client;
  }
}

class MemoryClient {
  constructor(server) {
    this.kind = 'memory';
    this.server = server;
    this.online = true;
    this.snapshot = undefined;
    this.queue = [];
    this.listeners = new Set();
    this.connectionWatchers = new Set();
    this.disconnectOps = new Map();
    this.timestamp = SERVER_TIMESTAMP;
    this.writes = [];
  }

  now() {
    return this.server.clock;
  }

  newId() {
    this.server.idCounter += 1;
    return `-M${String(this.server.idCounter).padStart(10, '0')}`;
  }

  /** Pandangan perangkat: data server (atau salinan terakhir saat offline) + tulisan tertunda. */
  view() {
    let tree = this.online ? this.server.tree : this.snapshot;
    for (const pending of this.queue) tree = applyPatch(tree, pending.optimistic);
    return tree;
  }

  notify() {
    if (!this.online && this.queue.length === 0) return;
    const tree = this.view();
    for (const listener of [...this.listeners]) {
      if (!this.listeners.has(listener)) continue;
      if (!listener.synced && !this.online) continue;
      let value = valueAt(tree, listener.path);
      if (listener.limit) value = lastKeys(value, listener.limit);
      if (listener.synced && treeEqual(listener.last, value)) continue;
      listener.synced = true;
      listener.last = value;
      listener.onValue(value === undefined ? null : value);
    }
  }

  listen(path, onValue, _onError, options = {}) {
    const listener = { path, onValue, limit: options.limitToLast || 0, synced: false, last: undefined };
    this.listeners.add(listener);
    queueMicrotask(() => {
      if (this.listeners.has(listener) && !listener.synced) this.notify();
    });
    return () => this.listeners.delete(listener);
  }

  async read(path) {
    if (!this.online) throw new Error('Client is offline');
    const value = valueAt(this.view(), path);
    return value === undefined ? null : value;
  }

  async readOldest(path, limit) {
    const value = await this.read(path);
    if (!isPlainObject(value)) return {};
    const out = {};
    for (const key of Object.keys(value).sort().slice(0, limit)) out[key] = value[key];
    return out;
  }

  write(patch) {
    this.writes.push(patch);
    if (this.online) {
      try {
        this.server.apply(patch);
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return new Promise((resolve, reject) => {
      const now = this.server.clock;
      const optimistic = {};
      for (const path of Object.keys(patch)) {
        const value = resolveServerValues(patch[path], now);
        optimistic[path] = value === null || value === undefined ? null : sanitizeTree(value) ?? null;
      }
      this.queue.push({ patch, optimistic, resolve, reject });
      this.notify();
    });
  }

  async transact(path, updateFn) {
    if (!this.online) throw new Error('Client is offline');
    const current = valueAt(this.server.tree, path);
    const next = updateFn(current === undefined ? null : current);
    if (next === undefined) return { committed: false, value: current === undefined ? null : current };
    this.server.apply({ [path]: next });
    const value = valueAt(this.server.tree, path);
    return { committed: true, value: value === undefined ? null : value };
  }

  async onDisconnect(path, value) {
    this.disconnectOps.set(path, value === undefined ? null : value);
    return async () => {
      this.disconnectOps.delete(path);
    };
  }

  watchConnection(callback) {
    this.connectionWatchers.add(callback);
    queueMicrotask(() => {
      if (this.connectionWatchers.has(callback)) callback(this.online);
    });
    return () => this.connectionWatchers.delete(callback);
  }

  setOnline(online) {
    if (online === this.online) return;
    if (!online) {
      this.snapshot = this.server.tree;
      this.online = false;
      if (this.disconnectOps.size) {
        const patch = Object.fromEntries(this.disconnectOps);
        this.disconnectOps.clear();
        this.server.apply(patch);
      }
    } else {
      this.online = true;
      const queued = this.queue;
      this.queue = [];
      for (const pending of queued) {
        try {
          this.server.apply(pending.patch);
          pending.resolve();
        } catch (error) {
          pending.reject(error);
        }
      }
      this.notify();
    }
    for (const watcher of [...this.connectionWatchers]) watcher(this.online);
  }

  async close() {
    this.setOnline(false);
    this.listeners.clear();
    this.connectionWatchers.clear();
    this.server.clients.delete(this);
  }
}
