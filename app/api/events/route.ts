import { db, member, failure } from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const u=await member();let timer:ReturnType<typeof setTimeout>|undefined;let closed=false;let count=0;const encoder=new TextEncoder();
 const stream=new ReadableStream({start(controller){const stop=()=>{if(closed)return;closed=true;clearTimeout(timer);try{controller.close();}catch{}};req.signal.addEventListener('abort',stop,{once:true});const tick=async()=>{try{if(closed)return;const allowed=await db().prepare('SELECT active FROM members WHERE user_id = ? AND active = 1').bind(u.id).first();if(!allowed){stop();return;}const row=await db().prepare('SELECT COALESCE(MAX(seq),0) AS revision FROM audit').first();if(closed)return;controller.enqueue(encoder.encode('event: revision\ndata: '+JSON.stringify(row)+'\n\n'));count++;if(count>=10){stop();return;}timer=setTimeout(tick,3000);}catch{stop();}};void tick();},cancel(){closed=true;clearTimeout(timer);}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'private, no-store, no-transform','X-Content-Type-Options':'nosniff'}});
 }catch(e){return failure(e);}}
