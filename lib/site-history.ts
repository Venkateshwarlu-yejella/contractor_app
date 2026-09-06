import type { Attendance, Site, Worker } from './domain.ts';

export function siteHistory(site: Site, attendance: Attendance[], workers: Worker[]) {
  const rows = attendance.filter(a => a.scope === site.scope && (a.amSiteId === site.id || a.pmSiteId === site.id));
  const totals = (items: Attendance[]) => ({
    days: items.reduce((sum, a) => sum + (Number(a.amSiteId === site.id) + Number(a.pmSiteId === site.id)) / 2, 0),
    cost: items.reduce((sum, a) => sum + (a.amSiteId === site.id ? a.amWage : 0) + (a.pmSiteId === site.id ? a.pmWage : 0), 0),
    morning: items.filter(a => a.amSiteId === site.id).length,
    afternoon: items.filter(a => a.pmSiteId === site.id).length,
    headcount: new Set(items.map(a => a.workerId)).size,
  });
  const dates = [...new Set(rows.map(a => a.date))].sort().reverse();
  return {
    totals: totals(rows),
    days: dates.map(date => {
      const records = rows.filter(a => a.date === date);
      return { date, records, ...totals(records) };
    }),
    workers: workers.filter(w => w.scope === site.scope).flatMap(worker => {
      const records = rows.filter(a => a.workerId === worker.id);
      if (!records.length) return [];
      const workedDates = records.map(a => a.date).sort();
      return [{ worker, firstDate: workedDates[0], lastDate: workedDates[workedDates.length - 1], ...totals(records) }];
    }).sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.worker.name.localeCompare(b.worker.name)),
  };
}
