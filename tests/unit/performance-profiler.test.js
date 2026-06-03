import { PerformanceProfiler } from '../../src/js/performance-profiler.js';

describe('PerformanceProfiler', () => {
  test('does not record or output when disabled', () => {
    const consoleRef = { groupCollapsed: jest.fn(), table: jest.fn(), groupEnd: jest.fn(), log: jest.fn() };
    const profiler = new PerformanceProfiler({ enabled: false, consoleRef });

    const result = profiler.measure('disabled-work', () => 42);
    profiler.start('manual');
    profiler.end('manual');
    const report = profiler.report();

    expect(result).toBe(42);
    expect(report).toEqual([]);
    expect(profiler.getRecords()).toEqual([]);
    expect(consoleRef.table).not.toHaveBeenCalled();
  });

  test('records sync and async measurements and reports grouped rows when enabled', async () => {
    const consoleRef = { groupCollapsed: jest.fn(), table: jest.fn(), groupEnd: jest.fn(), log: jest.fn() };
    const profiler = new PerformanceProfiler({ enabled: true, consoleRef });

    expect(profiler.measure('sync-work', () => 'ok')).toBe('ok');
    await expect(profiler.asyncMeasure('async-work', async () => 'done')).resolves.toBe('done');

    const rows = profiler.report('test profile');
    expect(rows.map((row) => row.label)).toEqual(expect.arrayContaining(['sync-work', 'async-work']));
    expect(consoleRef.groupCollapsed).toHaveBeenCalledWith('test profile');
    expect(consoleRef.table).toHaveBeenCalled();
    expect(consoleRef.groupEnd).toHaveBeenCalled();
  });
});
