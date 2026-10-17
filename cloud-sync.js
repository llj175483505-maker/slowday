(function (root) {
  'use strict';

  const META_PREFIX = 'slowday.cloud.v1.';
  const OWNER_KEY = 'slowday.cloud.owner.v1';
  const REQUEST_TIMEOUT_MS = 20000;
  const clone = value => JSON.parse(JSON.stringify(value));
  function same(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) || Array.isArray(b)) {
      return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => same(value, b[i]));
    }
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && same(a[key], b[key]));
  }

  function create(options) {
    const {client, storage, getState, applyState, onStatus, validate, blank, merge,
      refreshState, lockManager = root.navigator?.locks} = options;
    let user = null;
    let active = false;
    let generation = 0;
    let base = null;
    let revision = 0;
    let updatedAt = null;
    let flight = null;
    let timer = null;
    let retryDelay = 1000;
    let applying = false;

    const current = () => clone(validate(getState()));
    const alive = token => token === generation && !!user;
    const announce = (phase, message) => {
      if (typeof onStatus === 'function') onStatus({phase, message, updatedAt, email: user?.email || ''});
    };
    const clearTimer = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const schedule = delay => {
      clearTimer();
      if (!active || !user) return;
      const token = generation;
      timer = setTimeout(() => {
        timer = null;
        if (alive(token) && active) void sync();
      }, delay);
    };
    const pending = () => active && !!base && !same(current(), base);
    const localError = message => Object.assign(new Error(message), {localMessage: message});
    async function exclusive(token, work) {
      const guarded = () => alive(token) ? work() : false;
      if (typeof lockManager?.request === 'function') {
        return Promise.resolve(lockManager.request('slowday-cloud', {mode: 'exclusive'}, guarded));
      }
      return Promise.resolve().then(guarded);
    }
    const ensureOwner = () => {
      if (storage.getItem(OWNER_KEY) === user.id) return true;
      active = false;
      clearTimer();
      announce('setup', '账号已变化，请先确认要同步哪份记录。');
      return false;
    };

    function apply(next) {
      next = clone(validate(next));
      if (same(current(), next)) return;
      applying = true;
      try {
        if (applyState(next) === false) throw localError('本机备份未能保存，已暂停同步；请先导出记录。');
      } finally {
        applying = false;
      }
    }

    // The base is the last remote snapshot we merged, including a fetched snapshot
    // before a failed write. Keeping it avoids treating remote changes as local edits.
    function remember(remote, claimOwner = false) {
      const meta = {version: 1, userId: user.id, base: remote.data, revision: remote.revision, updatedAt: remote.updated_at};
      try {
        storage.setItem(META_PREFIX + user.id, JSON.stringify(meta));
        if (claimOwner) storage.setItem(OWNER_KEY, user.id);
      } catch (_) {
        throw localError('同步备份未能保存在本机，已保留现有记录；请先导出记录。');
      }
      base = clone(remote.data);
      revision = remote.revision;
      updatedAt = remote.updated_at;
    }

    function decode(row) {
      if (!row) return {data: clone(validate(blank())), revision: 0, updated_at: null};
      if (!Number.isSafeInteger(row.revision) || row.revision < 1 || !row.data) {
        throw localError('云端记录格式异常，已保留本机记录，请重试。');
      }
      try {
        return {data: clone(validate(row.data)), revision: row.revision, updated_at: typeof row.updated_at === 'string' ? row.updated_at : null};
      } catch (_) {
        throw localError('云端记录格式异常，已保留本机记录，请重试。');
      }
    }

    function request(promise) {
      let timeout;
      const deadline = new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Cloud request timed out')), REQUEST_TIMEOUT_MS);
      });
      // A timed-out RPC may still finish on the server. The next sync reads the
      // actual snapshot and revision before retrying; it never assumes failure.
      return Promise.race([promise, deadline]).finally(() => clearTimeout(timeout));
    }

    async function fetchRemote(id) {
      const result = await request(client.from('slowday_states').select('data,revision,updated_at').eq('user_id', id).maybeSingle());
      if (result.error) throw result.error;
      return decode(result.data);
    }

    function failed(error, token, retry) {
      if (!alive(token)) return false;
      if (String(error?.code || '') === 'PT403') {
        active = false;
        clearTimer();
        announce('setup', '登录账号已变化，请重新登录并确认同步方式；本机记录已保留。');
        return false;
      }
      const expired = ['401', 'PT401', 'PGRST301', 'PGRST302'].includes(String(error?.code || error?.status || ''));
      announce('error', error?.localMessage || (expired
        ? '登录已失效，请重新登录；记录仍保留在此设备。'
        : retry && active ? '暂时未连上云端，记录仍保留在此设备；恢复网络后会重试。'
        : '暂时未连上云端，记录仍保留在此设备；请重试连接。'));
      if (retry && active && !expired) {
        schedule(retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60000);
      }
      return false;
    }

    async function run(token, id) {
      try {
        if (!ensureOwner()) return false;
        announce('syncing', '正在同步到云端…');
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const remote = await fetchRemote(id);
          if (!alive(token) || !active || !ensureOwner()) return false;
          if (remote.revision === 0 && revision > 0) {
            throw localError('云端暂时未找到原有记录，已保留本机记录，请重试。');
          }

          const combined = clone(validate(merge(base, current(), remote.data)));
          apply(combined);
          if (!alive(token) || !active || !ensureOwner()) return false;
          remember(remote);

          // Read again after applying: a local callback may have added another edit.
          const outgoing = current();
          if (!ensureOwner()) return false;
          if (same(outgoing, remote.data) && remote.revision > 0) {
            retryDelay = 1000;
            announce('synced', '已同步到云端');
            return true;
          }
          const result = await request(client.rpc('slowday_save_state', {
            p_state: clone(outgoing), p_expected_revision: remote.revision, p_expected_user_id: id
          }));
          if (!alive(token) || !active || !ensureOwner()) return false;
          if (result.error) {
            if (String(result.error.code) === 'PT409') continue;
            throw result.error;
          }
          const ack = decode(Array.isArray(result.data) ? result.data[0] : result.data);
          if (ack.revision <= remote.revision) throw localError('云端尚未确认保存，记录仍保留在此设备，请重试。');

          // Changes made while the request was in flight are applied on top of the
          // acknowledged snapshot, never replaced by the older outgoing payload.
          const afterAck = clone(validate(merge(outgoing, current(), ack.data)));
          remember(ack);
          if (!alive(token) || !active || !ensureOwner()) return false;
          apply(afterAck);
          if (!pending()) {
            retryDelay = 1000;
            announce('synced', '已同步到云端');
            return true;
          }
        }
        throw localError('记录正在其他设备上更新，已保留本机修改，稍后自动重试。');
      } catch (error) {
        return failed(error, token, true);
      }
    }

    function sync() {
      if (!user || !active) return Promise.resolve(false);
      if (flight) return flight;
      clearTimer();
      const token = generation;
      const id = user.id;
      const promise = exclusive(token, () => run(token, id)).catch(error => failed(error, token, true));
      flight = promise;
      promise.then(success => {
        if (token === generation && flight === promise) {
          flight = null;
          // Also catch edits triggered by a synchronous UI status callback.
          if (success && active && pending()) schedule(0);
        }
      });
      return promise;
    }

    function reset() {
      generation += 1;
      clearTimer();
      flight = null;
      active = false;
      base = null;
      revision = 0;
      updatedAt = null;
      retryDelay = 1000;
    }

    async function connect(nextUser, {resume = true} = {}) {
      reset();
      user = nextUser && typeof nextUser.id === 'string' && nextUser.id ? {id: nextUser.id, email: nextUser.email || ''} : null;
      if (!user) {
        announce('local', '记录已保存在此设备');
        return false;
      }
      if (!resume) {
        announce('setup', '已登录；本机记录需要先恢复或导出，再确认云端同步方式。');
        return false;
      }
      const token = generation;
      try {
        const resumed = await exclusive(token, async () => {
          const meta = JSON.parse(storage.getItem(META_PREFIX + user.id) || 'null');
          if (storage.getItem(OWNER_KEY) !== user.id || meta?.version !== 1 || meta.userId !== user.id ||
              !Number.isSafeInteger(meta.revision) || meta.revision < 0) return false;
          // Refresh cached local state while cloud metadata cannot be changed by
          // another tab. Otherwise a fresh base plus stale local state can look
          // like an intentional undo of the other tab's changes.
          if (typeof refreshState === 'function' && await refreshState() === false) return false;
          if (!alive(token) || !ensureOwner()) return false;
          base = clone(validate(meta.base));
          revision = meta.revision;
          updatedAt = typeof meta.updatedAt === 'string' ? meta.updatedAt : null;
          active = true;
          return true;
        });
        if (!alive(token)) return false;
        if (resumed) return sync();
      } catch (_) {
        // Missing or damaged sync metadata never authorizes an automatic upload.
      }
      announce('setup', '已登录，请先确认合并本机记录，或使用云端记录。');
      return false;
    }

    async function activate(mode) {
      if (!user || !['merge', 'cloud'].includes(mode)) return false;
      reset();
      const token = generation;
      const id = user.id;
      announce('syncing', '正在读取云端记录…');
      try {
        const ready = await exclusive(token, async () => {
          const remote = await fetchRemote(id);
          if (!alive(token)) return false;
          if (mode === 'cloud' && remote.revision === 0) {
            throw localError('云端还没有记录，本机记录已保留；请选择合并本机记录并开启同步。');
          }
          // The app's explicit restore callback preserves edits made after the
          // user's confirmation without retaining unrelated pre-restore fields.
          const next = mode === 'cloud' ? remote.data : merge(clone(validate(blank())), current(), remote.data);
          // Invalidate old-account tabs before replacing shared local records. A
          // partial activation keeps this marker, so a reload asks for setup again.
          const setupOwner = 'setup:' + id;
          storage.setItem(OWNER_KEY, setupOwner);
          apply(next);
          if (!alive(token)) return false;
          if (storage.getItem(OWNER_KEY) !== setupOwner) {
            announce('setup', '其他页面已切换账号，请重新确认同步方式。');
            return false;
          }
          remember(remote, true);
          active = true;
          return true;
        });
        // Release the activation lock before sync acquires the same origin lock.
        return ready && alive(token) ? sync() : false;
      } catch (error) {
        return failed(error, token, false);
      }
    }

    function note() {
      if (applying) return;
      if (!user) {
        announce('local', '记录已保存在此设备');
        return;
      }
      if (!active) {
        announce('setup', '本机记录已保存；请先确认云端同步方式。');
        return;
      }
      announce('syncing', '正在同步到云端…');
      if (!flight) schedule(0);
    }

    function stop() {
      reset();
      user = null;
      announce('local', '记录已保存在此设备');
    }

    return Object.freeze({connect, activate, note, sync, stop, hasPending: pending});
  }

  const api = Object.freeze({create});
  root.SlowdayCloud = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
