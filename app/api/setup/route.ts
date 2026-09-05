import { db, identity, writeOrigin, failure, respond } from '@/lib/server';
import { seedDemo } from '@/lib/seed';
export async function POST(req:Request){try{writeOrigin(req);const u=await identity();const now=new Date().toISOString();await db().batch([
 db().prepare("INSERT OR IGNORE INTO settings (id,owner_id,created_at) VALUES ('family',?,?)").bind(u.id,now),
 db().prepare("INSERT OR IGNORE INTO members (email,user_id,name,role,active,created_at) SELECT ?,?,?,'admin',1,? FROM settings WHERE id = 'family' AND owner_id = ?").bind(u.email,u.id,u.name,now,u.id)
]);const owner=await db().prepare("SELECT owner_id FROM settings WHERE id = 'family'").first<{owner_id:string}>();if(owner?.owner_id!==u.id)return respond({error:'Ask the administrator to add you.'},403);await seedDemo();return respond({ok:true});}catch(e){return failure(e);}}
