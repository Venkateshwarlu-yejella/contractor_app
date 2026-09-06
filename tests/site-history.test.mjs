import test from 'node:test';
import assert from 'node:assert/strict';
import { siteHistory } from '../lib/site-history.ts';
const site = { id: 'a', scope: 'live' };
const worker = { id: 'w', scope: 'live', name: 'Worker', active: 0, dailyWage: 999999 };
const row = (date, amSiteId, pmSiteId, amWage = 45000, pmWage = 45000) => ({ id: date, workerId: 'w', scope: 'live', date, amSiteId, pmSiteId, amWage, pmWage });
test('split days allocate only saved wages and half-days to each site', () => {
  const records = [row('2026-09-01', 'a', 'b', 45000, 60000)];
  const a = siteHistory(site, records, [worker]);
  const b = siteHistory({ ...site, id: 'b' }, records, [worker]);
  assert.equal(a.totals.days, .5); assert.equal(a.totals.cost, 45000);
  assert.equal(b.totals.days, .5); assert.equal(b.totals.cost, 60000);
  assert.equal(a.days[0].morning, 1); assert.equal(a.days[0].afternoon, 0);
});
test('later transfers retain earlier site history and archived workers', () => {
  const records = [row('2026-09-01', 'a', 'a'), row('2026-09-02', 'a', 'b'), row('2026-09-03', 'b', 'b')];
  const snapshot = JSON.stringify(records);
  const result = siteHistory(site, records, [worker]);
  assert.deepEqual(result.days.map(d => d.date), ['2026-09-02', '2026-09-01']);
  assert.equal(result.workers[0].firstDate, '2026-09-01');
  assert.equal(result.workers[0].lastDate, '2026-09-02');
  assert.equal(result.workers[0].days, 1.5); assert.equal(result.workers[0].cost, 135000);
  assert.equal(result.workers[0].worker.active, 0);
  assert.equal(JSON.stringify(records), snapshot);
});
test('full days count one worker; absence and sample records are excluded', () => {
  const result = siteHistory(site, [row('2026-09-01', 'a', 'a'), row('2026-09-02', null, null, 0, 0), { ...row('2026-09-03', 'a', 'a'), scope: 'demo' }], [worker]);
  assert.equal(result.totals.headcount, 1); assert.equal(result.totals.days, 1);
  assert.equal(result.days.length, 1);
  assert.equal(siteHistory({ ...site, id: 'empty' }, [], [worker]).workers.length, 0);
});
