import { db, member, camel, respond, failure, HttpError } from '@/lib/server';
import { scopeSchema } from '@/lib/validation';
import { businessDate } from '@/lib/domain';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const u=await member();const scope=scopeSchema.parse(new URL(req.url).searchParams.get('scope')??'demo');
 if(scope==='demo'&&!await db().prepare("SELECT id FROM settings WHERE id='demo_seeded'").first())throw new HttpError(428,'SETUP_REQUIRED');
 const rows=await db().batch([
 db().prepare('SELECT * FROM workers WHERE scope = ? ORDER BY active DESC, name').bind(scope),
 db().prepare('SELECT * FROM sites WHERE scope = ? ORDER BY rowid').bind(scope),
 db().prepare('SELECT * FROM attendance WHERE scope = ? ORDER BY date DESC').bind(scope),
 db().prepare('SELECT * FROM payments WHERE scope = ? ORDER BY created_at DESC, id DESC').bind(scope),
 db().prepare('SELECT COALESCE(MAX(seq),0) AS revision FROM audit'),
 db().prepare(u.role==='admin'?'SELECT email,name,role,active FROM members ORDER BY created_at':'SELECT email,name,role,active FROM members WHERE email = ?').bind(...(u.role==='admin'?[]:[u.email]))
 ]);
 return respond({workers:rows[0].results.map(camel),sites:rows[1].results.map(camel),attendance:rows[2].results.map(camel),payments:rows[3].results.map(camel),revision:(rows[4].results[0] as {revision:number}).revision,members:rows[5].results,user:{name:u.name,email:u.email,role:u.role},today:businessDate(),historyFrom:null});
 }catch(e){return failure(e);}}
