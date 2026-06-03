const now = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

function resolveInitialEnabled() {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location?.search || '');
      if (params.get('profile') === 'true' || params.get('profile') === '1') return true;
      if (window.localStorage?.getItem('retirementCalculatorProfile') === 'true') return true;
      if (window.localStorage?.getItem('profile') === 'true') return true;
    }
  } catch (_) {
    // Accessing localStorage can throw in some test/browser privacy contexts.
  }
  return false;
}

class PerformanceProfiler {
  constructor({ enabled = resolveInitialEnabled(), consoleRef = null } = {}) {
    this.enabled = Boolean(enabled);
    this.consoleRef = consoleRef;
    this.reset();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  isEnabled() {
    return this.enabled;
  }

  reset() {
    this.active = new Map();
    this.records = [];
  }

  start(label) {
    if (!this.enabled || !label) return null;
    const startedAt = now();
    this.active.set(label, startedAt);
    return startedAt;
  }

  end(label, metadata = {}) {
    if (!this.enabled || !label) return null;
    const endedAt = now();
    const startedAt = this.active.get(label);
    if (startedAt == null) return null;
    this.active.delete(label);
    const record = {
      label,
      duration: endedAt - startedAt,
      startedAt,
      endedAt,
      ...metadata,
    };
    this.records.push(record);
    return record;
  }

  measure(label, fn, metadata = {}) {
    if (!this.enabled) return fn();
    this.start(label);
    try {
      return fn();
    } finally {
      this.end(label, metadata);
    }
  }

  async asyncMeasure(label, fn, metadata = {}) {
    if (!this.enabled) return fn();
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label, metadata);
    }
  }

  getRecords() {
    return this.records.slice();
  }

  summary() {
    const totals = new Map();
    this.records.forEach((record) => {
      const prior = totals.get(record.label) || { label: record.label, count: 0, totalMs: 0, maxMs: 0 };
      prior.count += 1;
      prior.totalMs += record.duration;
      prior.maxMs = Math.max(prior.maxMs, record.duration);
      totals.set(record.label, prior);
    });
    return Array.from(totals.values()).map((row) => ({
      ...row,
      totalMs: Number(row.totalMs.toFixed(2)),
      avgMs: Number((row.totalMs / row.count).toFixed(2)),
      maxMs: Number(row.maxMs.toFixed(2)),
    }));
  }

  report(title = 'Retirement calculator performance profile') {
    if (!this.enabled) return [];
    const rows = this.summary();
    const consoleTarget = this.consoleRef || (typeof console !== 'undefined' ? console : null);
    if (!consoleTarget) return rows;

    if (typeof consoleTarget.groupCollapsed === 'function') consoleTarget.groupCollapsed(title);
    else if (typeof consoleTarget.log === 'function') consoleTarget.log(title);

    if (typeof consoleTarget.table === 'function') consoleTarget.table(rows);
    else if (typeof consoleTarget.log === 'function') consoleTarget.log(rows);

    if (typeof consoleTarget.groupEnd === 'function') consoleTarget.groupEnd();
    return rows;
  }
}

const profiler = new PerformanceProfiler();

export { PerformanceProfiler, profiler };
export default profiler;
