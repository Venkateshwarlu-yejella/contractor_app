'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, CalendarDays, ClipboardCheck, Sunrise, Sunset } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { siteHistory } from '@/lib/site-history';
import { dayLabel, money, type AppState, type Attendance, type Site, type Worker } from '@/lib/domain';

type Props = {
  site: Site; state: AppState; date: string; onDate: (date: string) => void;
  onBack: () => void; onMark: () => void;
  onEdit: (worker: Worker, record: Attendance) => void;
  onWorker: (worker: Worker) => void; photo: (worker: Worker) => ReactNode;
};

export default function SiteDetail({ site, state, date, onDate, onBack, onMark, onEdit, onWorker, photo }: Props) {
  const [tab, setTab] = useState('day');
  const history = useMemo(() => siteHistory(site, state.attendance, state.workers), [site, state.attendance, state.workers]);
  const day = history.days.find(d => d.date === date);
  const canEdit = !!site.active && (state.user.role === 'admin' || date === state.today);
  function selectDay(value: string) { if (value && value <= state.today) { onDate(value); setTab('day'); } }
  return <section className="site-detail">
    <button className="text-button" onClick={onBack}><ArrowLeft/>All sites</button>
    <div className="page-heading"><div><p className="eyebrow">{site.active ? 'WORKSITE' : 'ARCHIVED WORKSITE'}</p><h1>{site.name}</h1><p className="heading-sub">{site.owner} · {site.address}</p></div></div>
    {state.historyFrom && <p className="help-note">Available history starts {dayLabel(state.historyFrom)}.</p>}
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="site-detail-tabs"><TabsTrigger value="day">Workers by day</TabsTrigger><TabsTrigger value="days">Attendance history</TabsTrigger><TabsTrigger value="workers">Worker history</TabsTrigger></TabsList>
      <TabsContent value="day">
        <div className="list-toolbar"><h2>{date === state.today ? 'Today’s workers' : dayLabel(date)}</h2><div className="site-date-actions"><button className="btn secondary" onClick={() => selectDay(state.today)}>Today</button><label className="date-control"><CalendarDays/><input aria-label="Site attendance date" type="date" max={state.today} value={date} onChange={e => selectDay(e.target.value)}/></label></div></div>
        <div className="site-day-totals"><span><Sunrise/>Morning <b>{day?.morning ?? 0}</b></span><span><Sunset/>Afternoon <b>{day?.afternoon ?? 0}</b></span><span>Workers <b>{day?.headcount ?? 0}</b></span><span>Wages <b>{money(day?.cost ?? 0)}</b></span></div>
        <p className="help-note">Workers marked present at this site. Each half-day counts only at its recorded site.</p>
        {canEdit && <button className="btn primary" onClick={onMark}><ClipboardCheck/>Mark attendance / add a worker</button>}
        <div className="worker-grid site-day-workers">{day?.records.map(record => {
          const worker = state.workers.find(w => w.id === record.workerId);
          if (!worker) return null;
          const am = record.amSiteId === site.id, pm = record.pmSiteId === site.id;
          return <article key={record.id} className="worker-profile-card"><button className="site-worker-open" onClick={() => onWorker(worker)}>{photo(worker)}<h3>{worker.name}</h3></button><div className="site-slot-labels"><span className={am ? 'tag green' : 'tag'}><Sunrise/>{am ? 'Morning here' : 'Morning elsewhere / absent'}</span><span className={pm ? 'tag green' : 'tag'}><Sunset/>{pm ? 'Afternoon here' : 'Afternoon elsewhere / absent'}</span></div><b>{am && pm ? 'Full day' : 'Half day'} · {money((am ? record.amWage : 0) + (pm ? record.pmWage : 0))}</b>{canEdit && !!worker.active && <button className="btn secondary" onClick={() => onEdit(worker, record)}>Edit / move half-day</button>}</article>;
        })}</div>
        {!day && <div className="empty-state"><h3>No attendance recorded here for this date</h3><p>Unmarked workers are not counted as absent.</p></div>}
        {!site.active && <p className="help-note">This site is archived. Its attendance and wage history remain available.</p>}
      </TabsContent>
      <TabsContent value="days"><h2>Attendance history</h2><p className="help-note">Select a date to see its workers and morning / afternoon attendance.</p><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Workers</TableHead><TableHead>Morning</TableHead><TableHead>Afternoon</TableHead><TableHead>Worker days</TableHead><TableHead>Wages</TableHead></TableRow></TableHeader><TableBody>{history.days.map(d => <TableRow key={d.date}><TableCell><button className="text-button" onClick={() => selectDay(d.date)}>{dayLabel(d.date)}</button></TableCell><TableCell>{d.headcount}</TableCell><TableCell>{d.morning}</TableCell><TableCell>{d.afternoon}</TableCell><TableCell>{d.days}</TableCell><TableCell>{money(d.cost)}</TableCell></TableRow>)}</TableBody></Table>{!history.days.length && <p className="empty-state">No attendance history yet.</p>}</TabsContent>
      <TabsContent value="workers"><h2>Everyone who worked here</h2><p className="help-note">{history.totals.days} worker days · {money(history.totals.cost)} earned at this site. Includes archived workers. Wages use the amounts saved with attendance.</p><Table><TableHeader><TableRow><TableHead>Worker</TableHead><TableHead>First worked</TableHead><TableHead>Last worked</TableHead><TableHead>Total days</TableHead><TableHead>Wages earned here</TableHead></TableRow></TableHeader><TableBody>{history.workers.map(row => <TableRow key={row.worker.id}><TableCell><button className="table-worker" onClick={() => onWorker(row.worker)}>{photo(row.worker)}<span>{row.worker.name}{!row.worker.active && <small className="block">Archived</small>}</span></button></TableCell><TableCell>{dayLabel(row.firstDate)}</TableCell><TableCell>{dayLabel(row.lastDate)}</TableCell><TableCell>{row.days}</TableCell><TableCell>{money(row.cost)}</TableCell></TableRow>)}</TableBody></Table>{!history.workers.length && <p className="empty-state">Workers appear after attendance is recorded at this site.</p>}</TabsContent>
    </Tabs>
  </section>;
}
