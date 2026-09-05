import {member,db,body,writeOrigin,hash,receipt,commitChange,scopeWorker,checkDay,respond,failure} from '@/lib/server';
import {paymentSchema} from '@/lib/validation';
export async function POST(req:Request){try{writeOrigin(req);const u=await member();const b=paymentSchema.parse(await body(req));const digest=await hash(b);const replay=await receipt(b.operationId,digest,u.id);if(replay)return respond(replay);checkDay(b.date,u);await scopeWorker(b.workerId,b.scope);
 const stmt=db().prepare('INSERT INTO payments (id,scope,worker_id,amount,kind,date,method,notes,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(b.operationId,b.scope,b.workerId,b.amount,b.kind,b.date,b.method,b.notes,u.id,new Date().toISOString());
 return respond(await commitChange([stmt],b,u,digest,'payment',b.operationId,b));}catch(e){return failure(e);}}
