import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ZodError } from 'zod';
import { businessDate, halfWages, type Scope, type Attendance, type Worker } from './domain';
export class HttpError extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status;}}
export function db(){if(!env.DB)throw new HttpError(503,'Records are temporarily unavailable. Please try again.');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new HttpError(503,'Photo storage is temporarily unavailable.');return env.BUCKET;}
export function camel<T>(row:unknown):T{return Object.fromEntries(Object.entries(row as Record<string,unknown>).map(([k,v])=>[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),v])) as T;}
export async function identity(){const [user,h]=await Promise.all([getChatGPTUser(),headers()]);const id=h.get('oai-authenticated-user-id');if(!user||!id)throw new HttpError(401,'Please sign in again.');return {id,email:user.email.toLowerCase(),name:user.displayName};}
export async function member(){
 const who=await identity();
 const row=await db().prepare('SELECT * FROM members WHERE (user_id = ? OR (user_id IS NULL AND email = ?)) AND active = 1').bind(who.id,who.email).first<{name:string;role:'admin'|'operator';user_id:string|null}>();
 if(!row){const initialized=await db().prepare("SELECT id FROM settings WHERE id = 'family'").first();if(!initialized)throw new HttpError(428,'SETUP_REQUIRED');throw new HttpError(403,'Ask the family administrator to add your sign-in email.');}
 if(!row.user_id)await db().prepare('UPDATE members SET user_id = ? WHERE email = ? AND user_id IS NULL AND active = 1').bind(who.id,who.email).run();
 return {...who,name:row.name,role:row.role};
}
export type Actor=Awaited<ReturnType<typeof member>>;
export function admin(user:Actor){if(user.role!=='admin')throw new HttpError(403,'A family administrator needs to make this change.');}
export function writeOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new HttpError(403,'Please open the app directly to save changes.');if(req.headers.get('sec-fetch-site')==='cross-site')throw new HttpError(403,'This request is not allowed.');}
export function respond(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
export function failure(error:unknown){if(error instanceof ZodError)return respond({error:error.issues[0]?.message??'Check your entries.'},400);if(error instanceof HttpError)return respond({error:error.message},error.status);console.error('Request failed',error);return respond({error:'Could not save or load your records. Your entries are still here; please retry.'},503);}
export async function body(req:Request){const text=await boundedBytes(req,16000);try{return JSON.parse(new TextDecoder().decode(text));}catch{throw new HttpError(400,'The request could not be read.');}}
export async function boundedBytes(req:Request,max:number){const reader=req.body?.getReader();if(!reader)throw new HttpError(400,'An empty request was received.');let size=0;const chunks:Uint8Array[]=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new HttpError(413,'This file or request is too large.');}chunks.push(value);}const result=new Uint8Array(size);let i=0;for(const c of chunks){result.set(c,i);i+=c.length;}return result;}
export async function hash(value:unknown){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(b)).map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function receipt(id:string,digest:string,actor:string){const row=await db().prepare('SELECT payload_hash, actor, entity_id FROM audit WHERE id = ?').bind(id).first<{payload_hash:string;actor:string;entity_id:string}>();if(!row)return null;if(row.payload_hash!==digest||row.actor!==actor)throw new HttpError(409,'This request was already used for a different change.');return {ok:true,id:row.entity_id,replayed:true};}
export function auditStatement(id:string,scope:Scope,entity:string,entityId:string,user:Actor,digest:string,payload:unknown){return db().prepare('INSERT INTO audit (id,scope,entity,entity_id,actor,payload_hash,payload,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,scope,entity,entityId,user.id,digest,JSON.stringify(payload),new Date().toISOString());}
export async function scopeWorker(id:string,scope:Scope,active=true){const row=await db().prepare('SELECT * FROM workers WHERE id = ? AND scope = ?').bind(id,scope).first();if(!row)throw new HttpError(404,'Worker not found.');const w=camel<Worker>(row);if(active&&!w.active)throw new HttpError(409,'This worker is archived.');return w;}
export async function scopePhoto(id:string|null,scope:Scope){if(id&&!await db().prepare('SELECT id FROM media WHERE id = ? AND scope = ?').bind(id,scope).first())throw new HttpError(400,'Please upload this photo again.');}
export function checkDay(day:string,actor:Actor){if(day>businessDate())throw new HttpError(400,'You cannot record attendance or a payment in the future.');if(day<businessDate()&&actor.role!=='admin')throw new HttpError(403,'An administrator must change past dates.');}
export {halfWages};
export type {Attendance};
export async function commitChange(statements:ReturnType<ReturnType<typeof db>['prepare']>[],input:{operationId:string;scope:Scope},user:Actor,digest:string,entity:string,entityId:string,payload:unknown){
 const conditional=db().prepare('INSERT INTO audit (id,scope,entity,entity_id,actor,payload_hash,payload,created_at) SELECT ?,?,?,?,?,?,?,? WHERE changes() = 1').bind(input.operationId,input.scope,entity,entityId,user.id,digest,JSON.stringify(payload),new Date().toISOString());
 try{const result=await db().batch([...statements,conditional]);if(result[result.length-1].meta.changes!==1){const existing=await receipt(input.operationId,digest,user.id);if(existing)return existing;throw new HttpError(409,'Someone changed this record. The latest data has been loaded. Please review and try again.');}return {ok:true,id:entityId};}catch(e){const existing=await receipt(input.operationId,digest,user.id);if(existing)return existing;throw e;}
}
