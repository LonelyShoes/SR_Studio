/**
 * Driver Firebase Realtime Database.
 *
 * Seluruh modul cloud berbicara lewat antarmuka driver kecil ini (bukan langsung ke SDK),
 * sehingga logika sinkronisasi bisa diuji dengan driver memori dan SDK dimuat secara lazy
 * (tidak membebani bundle awal).
 *
 * Antarmuka driver (semua path absolut dari akar database, tanpa garis miring di depan):
 *   listen(path, onValue, onError?, { limitToLast? }) → unsubscribe
 *   read(path) → Promise<nilai | null>
 *   readOldest(path, limit) → Promise<Record<kunci, nilai>>
 *   write(patch) → Promise<void>            multi-path atomik; nilai null = hapus
 *   transact(path, updateFn) → Promise<{ committed, value }>
 *   onDisconnect(path, value) → Promise<cancelFn>
 *   watchConnection(cb) → unsubscribe
 *   newId() / now() / timestamp / close()
 */

export const SERVER_TIMESTAMP = Object.freeze({ '.sv': 'timestamp' });

export async function createFirebaseDriver(databaseUrl) {
  const [{ initializeApp, deleteApp }, sdk] = await Promise.all([
    import('@firebase/app'),
    import('@firebase/database'),
  ]);

  const app = initializeApp({ databaseURL: databaseUrl }, `sr-studio-${Date.now().toString(36)}`);
  const database = sdk.getDatabase(app);
  const rootRef = sdk.ref(database);
  const at = (path) => sdk.ref(database, path);

  let serverOffset = 0;
  const stopOffset = sdk.onValue(at('.info/serverTimeOffset'), (snapshot) => {
    serverOffset = Number(snapshot.val()) || 0;
  });

  return {
    kind: 'firebase',
    databaseUrl,
    timestamp: SERVER_TIMESTAMP,
    now: () => Date.now() + serverOffset,
    newId: () => sdk.push(rootRef).key,

    listen(path, onValue, onError, options = {}) {
      const target = options.limitToLast
        ? sdk.query(at(path), sdk.orderByKey(), sdk.limitToLast(options.limitToLast))
        : at(path);
      return sdk.onValue(
        target,
        (snapshot) => onValue(snapshot.val()),
        (error) => onError?.(error)
      );
    },

    async read(path) {
      return (await sdk.get(at(path))).val();
    },

    async readOldest(path, limit) {
      const snapshot = await sdk.get(sdk.query(at(path), sdk.orderByKey(), sdk.limitToFirst(limit)));
      return snapshot.val() || {};
    },

    write(patch) {
      return sdk.update(rootRef, patch);
    },

    async transact(path, updateFn) {
      const result = await sdk.runTransaction(at(path), updateFn, { applyLocally: false });
      return { committed: result.committed, value: result.snapshot.val() };
    },

    async onDisconnect(path, value) {
      const handle = sdk.onDisconnect(at(path));
      if (value === null || value === undefined) await handle.remove();
      else await handle.set(value);
      return () => handle.cancel();
    },

    watchConnection(callback) {
      return sdk.onValue(at('.info/connected'), (snapshot) => callback(snapshot.val() === true));
    },

    async close() {
      stopOffset();
      sdk.goOffline(database);
      await deleteApp(app);
    },
  };
}
