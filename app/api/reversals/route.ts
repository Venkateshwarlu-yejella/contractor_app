import {member,admin,db,body,writeOrigin,hash,receipt,commitChange,respond,failure,HttpError} from '@/lib/server';
import {reversalSchema} from '@/lib/validation';
import {businessDate} from '@/lib/domain';
export async function POST(req:Request){try{writeOrigin(req);const u=await member();admin(u);const b=reversalSchema.parse(await body(req));const digest=await hash(b);const replay=await receipt(b.operationId,digest,u.id);if(replay)return respond(replay);
 const p=await db().prepare("SELECT * FROM payments WHERE id=? AND scope=? AND kind != 'reversal'").bind(b.paymentId,b.scope).first<{worker_id:string;amount:number;method:string}>();if(!p)throw new HttpError(404,'Payment not found.');if(await db().prepare('SELECT id FROM payments WHERE reversal_of=?').bind(b.paymentId).first())throw new HttpError(409,'This payment was already reversed.');
 const stmt=db().prepare("INSERT INTO payments (id,scope,worker_id,amount,kind,date,method,notes,reversal_of,created_by,created_at) VALUES (?,?,?,?,'reversal',?,?,?,?,?,?)").bind(b.operationId,b.scope,p.worker_id,p.amount,businessDate(),p.method,b.reason,b.paymentId,u.id,new Date().toISOString());
 return respond(await commitChange([stmt],b,u,digest,'reversal',b.operationId,b));}catch(e){return failure(e);}}
