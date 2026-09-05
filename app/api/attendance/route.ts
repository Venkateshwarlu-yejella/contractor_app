import {member,db,body,writeOrigin,hash,receipt,commitChange,scopeWorker,checkDay,camel,halfWages,respond,failure,HttpError,type Attendance} from '@/lib/server';
import {attendanceSchema} from '@/lib/validation';
import {businessDate} from '@/lib/domain';
export async function POST(req:Request){try{writeOrigin(req);const u=await member();const b=attendanceSchema.parse(await body(req));const digest=await hash(b);const replay=await receipt(b.operationId,digest,u.id);if(replay)return respond(replay);checkDay(b.date,u);const worker=await scopeWorker(b.workerId,b.scope);
 for(const id of new Set([b.amSiteId,b.pmSiteId].filter(Boolean))){if(!await db().prepare('SELECT id FROM sites WHERE id=? AND scope=? AND active=1').bind(id,b.scope).first())throw new HttpError(400,'Choose an active site.');}
 const raw=await db().prepare('SELECT * FROM attendance WHERE worker_id=? AND date=? AND scope=?').bind(worker.id,b.date,b.scope).first();const prev=raw?camel<Attendance>(raw):undefined;
 if((prev?.version??0)!==b.version)throw new HttpError(409,'Someone changed this record. Review the latest attendance and try again.');
 if(prev&&b.date<businessDate()&&b.reason.trim().length<3)throw new HttpError(400,'Add a short reason for correcting past attendance.');
 const wages=halfWages(worker.dailyWage,prev,b.amSiteId,b.pmSiteId);const id=worker.id+'_'+b.date;const now=new Date().toISOString();
 const result=await commitChange([
 db().prepare('INSERT OR IGNORE INTO attendance (id,scope,worker_id,date,updated_by,updated_at) VALUES (?,?,?,?,?,?)').bind(id,b.scope,worker.id,b.date,u.id,now),
 db().prepare('UPDATE attendance SET am_site_id=?,pm_site_id=?,am_wage=?,pm_wage=?,version=version+1,last_operation=?,updated_by=?,updated_at=? WHERE worker_id=? AND date=? AND scope=? AND version=?').bind(b.amSiteId,b.pmSiteId,wages.amWage,wages.pmWage,b.operationId,u.id,now,worker.id,b.date,b.scope,b.version)
 ],b,u,digest,'attendance',id,{before:prev??null,after:{...b,...wages}});
 return respond(result);}catch(e){return failure(e);}}
