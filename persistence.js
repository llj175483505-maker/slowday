(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SlowdayPersistence = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const MISSING = Symbol('missing');
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const define = (object, key, value) => Object.defineProperty(object, key, {
    value, enumerable: true, configurable: true, writable: true
  });

  function copy(value) {
    if (Array.isArray(value)) return value.map(copy);
    if (!record(value)) return value;
    const result = {};
    for (const key of Object.keys(value)) define(result, key, copy(value[key]));
    return result;
  }

  function equal(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) || Array.isArray(b)) {
      return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => equal(value, b[i]));
    }
    if (!record(a) || !record(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => own(b, key) && equal(a[key], b[key]));
  }

  function entities(value) {
    if (value === MISSING) return true;
    if (!Array.isArray(value)) return false;
    const ids = new Set();
    return value.every(item => {
      if (!record(item) || typeof item.id !== 'string' || !item.id || ids.has(item.id)) return false;
      ids.add(item.id);
      return true;
    });
  }

  function mergeValue(base, local, remote) {
    if (equal(local, base)) return copy(remote);
    if (equal(remote, base) || equal(local, remote)) return copy(local);
    if (local === MISSING || remote === MISSING) return copy(local);

    if (record(local) && record(remote) && (record(base) || base === MISSING)) {
      const result = {};
      for (const key of new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base === MISSING ? {} : base)])) {
        const value = mergeValue(
          base !== MISSING && own(base, key) ? base[key] : MISSING,
          own(local, key) ? local[key] : MISSING,
          own(remote, key) ? remote[key] : MISSING
        );
        if (value !== MISSING) define(result, key, value);
      }
      return result;
    }

    if (Array.isArray(local) && Array.isArray(remote) && [base, local, remote].every(entities)) {
      const asMap = value => new Map((value === MISSING ? [] : value).map(item => [item.id, item]));
      const before = asMap(base), here = asMap(local), elsewhere = asMap(remote), result = [];
      for (const id of new Set([...here.keys(), ...elsewhere.keys(), ...before.keys()])) {
        const value = mergeValue(
          before.has(id) ? before.get(id) : MISSING,
          here.has(id) ? here.get(id) : MISSING,
          elsewhere.has(id) ? elsewhere.get(id) : MISSING
        );
        if (value !== MISSING) result.push(value);
      }
      return result;
    }

    // A conflict on the same leaf follows the change made in this tab, including false.
    return copy(local);
  }

  function merge(base, local, remote) {
    return mergeValue(base, local, remote);
  }

  function failure(code, message, cause) {
    const error = new Error(message);
    error.code = code;
    if (cause !== undefined) error.cause = cause;
    return error;
  }

  function create({storage, key, validate, blank}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' ||
        typeof key !== 'string' || !key || typeof validate !== 'function' || typeof blank !== 'function') {
      throw new TypeError('需要存储、记录键、校验和空记录函数');
    }
    let baseline, loaded = false, hadStoredData = false;
    const validCopy = value => copy(validate(copy(value)));
    const ok = state => ({ok: true, state: copy(state), error: null});
    const fail = (state, error) => ({ok: false, state, error});

    function read() {
      let raw;
      try { raw = storage.getItem(key); }
      catch (cause) { throw failure('READ_FAILED', '无法读取浏览器中的记录', cause); }
      if (raw === null && hadStoredData) throw failure('MISSING_DATA', '本机记录已被清除，已保留当前记录，请恢复备份或云端记录');
      try { const result = validCopy(raw === null ? blank() : JSON.parse(raw)); if (raw !== null) hadStoredData = true; return result; }
      catch (cause) { throw failure('INVALID_DATA', '已保存的记录格式异常，原始记录已保留', cause); }
    }

    function load() {
      try {
        const stored = read();
        baseline = copy(stored);
        loaded = true;
        return ok(stored);
      } catch (error) {
        loaded = false;
        return fail(null, error);
      }
    }

    function prepare(state) {
      if (!loaded) throw failure('LOAD_REQUIRED', '请先成功读取已有记录，再进行保存');
      let local;
      try { local = validCopy(state); }
      catch (cause) { throw failure('INVALID_STATE', '当前记录格式异常，尚未保存', cause); }
      const remote = read();
      let merged;
      try { merged = validCopy(merge(baseline, local, remote)); }
      catch (cause) { throw failure('INVALID_STATE', '合并后的记录格式异常，尚未保存', cause); }
      return {remote, merged};
    }

    function save(state) {
      try {
        const {merged} = prepare(state);
        try { storage.setItem(key, JSON.stringify(merged)); }
        catch (cause) { throw failure('WRITE_FAILED', '浏览器未能保存本次记录', cause); }
        baseline = copy(merged);
        hadStoredData = true;
        return ok(merged);
      } catch (error) {
        return fail(state, error);
      }
    }

    function refresh(state) {
      try {
        const {remote, merged} = prepare(state);
        // Keep unsaved local changes different from the newly observed stored baseline.
        baseline = copy(remote);
        return ok(merged);
      } catch (error) {
        return fail(state, error);
      }
    }

    // Explicit recovery only: the caller must first offer a backup and obtain
    // confirmation before replacing a corrupted or different set of records.
    function replace(state) {
      let next;
      try { next = validCopy(state); }
      catch (cause) { return fail(state, failure('INVALID_STATE', '恢复的记录格式异常，尚未保存', cause)); }
      try { storage.setItem(key, JSON.stringify(next)); }
      catch (cause) { return fail(state, failure('WRITE_FAILED', '浏览器未能保存恢复的记录', cause)); }
      baseline = copy(next);
      hadStoredData = true;
      loaded = true;
      return ok(next);
    }

    return {load, save, refresh, replace};
  }

  return Object.freeze({merge, create});
});
