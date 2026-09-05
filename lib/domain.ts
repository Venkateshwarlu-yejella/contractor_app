export type Scope = 'demo' | 'live';
export type Worker = {id:string;scope:Scope;name:string;phone:string;dailyWage:number;openingBalance:number;photoKey:string|null;samplePhoto:number|null;active:number;version:number};
export type Site = {id:string;scope:Scope;name:string;owner:string;address:string;color:string;photoKey:string|null;active:number;version:number};
export type Attendance = {id:string;scope:Scope;workerId:string;date:string;amSiteId:string|null;pmSiteId:string|null;amWage:number;pmWage:number;version:number;updatedAt:string;updatedBy:string};
export type Payment = {id:string;scope:Scope;workerId:string;amount:number;kind:'payment'|'advance'|'reversal';date:string;method:string;notes:string;reversalOf:string|null;createdBy:string;createdAt:string};
export type Member = {email:string;name:string;role:'admin'|'operator';active:number};
export type AppState = {workers:Worker[];sites:Site[];attendance:Attendance[];payments:Payment[];members:Member[];user:{name:string;email:string;role:'admin'|'operator'};revision:number;today:string;historyFrom:string|null};
export function businessDate(d=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
export function money(minor:number){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:minor%100===0?0:2}).format(minor/100);}
export function dayLabel(value:string){return new Date(value+'T12:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
export function workerBalance(worker:Worker,attendance:Attendance[],payments:Payment[]){
 const earned=attendance.filter(a=>a.workerId===worker.id).reduce((s,a)=>s+a.amWage+a.pmWage,0);
 const paid=payments.filter(p=>p.workerId===worker.id).reduce((s,p)=>s+(p.kind==='reversal'?-p.amount:p.amount),0);
 return {earned,paid,balance:worker.openingBalance+earned-paid};
}
export function halfWages(dailyWage:number,previous:Attendance|undefined,am:string|null,pm:string|null){
 return {amWage:am ? (previous?.amSiteId ? previous.amWage : dailyWage/2) : 0, pmWage:pm ? (previous?.pmSiteId ? previous.pmWage : dailyWage/2) : 0};
}
export function reportRows(state:AppState,from:string,to:string){
 return state.sites.map(site=>{
  const rows=state.attendance.filter(a=>a.date>=from&&a.date<=to);
  const slots=rows.reduce((s,a)=>s+Number(a.amSiteId===site.id)+Number(a.pmSiteId===site.id),0);
  const cost=rows.reduce((s,a)=>s+(a.amSiteId===site.id?a.amWage:0)+(a.pmSiteId===site.id?a.pmWage:0),0);
  return {...site,days:slots/2,cost,headcount:new Set(rows.filter(a=>a.amSiteId===site.id||a.pmSiteId===site.id).map(a=>a.workerId)).size};
 });
}
export function csvCell(value:unknown){let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
