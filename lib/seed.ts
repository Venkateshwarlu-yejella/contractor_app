import { db } from './server';
import { businessDate } from './domain';
export async function seedDemo(){
 if(await db().prepare("SELECT id FROM settings WHERE id = 'demo_seeded'").first())return;
 const now=new Date().toISOString();const today=businessDate();
 const names=['Ramesh','Lakshmi','Narasimha','Ravi','Suresh','Anji','Padma','Srinu','Mahesh','Saroja','Kumar','Prasad'];
 const rates=[900,700,1000,800,850,800,700,850,950,750,800,900];
 const siteData=[['Madhapur House','Mr. Reddy','Madhapur, Hyderabad','orange'],['Kondapur Apartments','Mrs. Rao','Kondapur, Hyderabad','blue'],['Gachibowli Villa','Mr. Kumar','Gachibowli, Hyderabad','purple'],['Kukatpally Renovation','Mr. Prasad','Kukatpally, Hyderabad','green']];
 const statements=[db().prepare("INSERT INTO settings (id,owner_id,created_at) VALUES ('demo_seeded','demo',?)").bind(now)];
 // Keep each prepared statement below D1's parameter limit. The entire seed commits atomically.
 function rows(table:string,columns:string[],data:(string|number|null)[][]){const perBatch=Math.floor(90/columns.length);for(let i=0;i<data.length;i+=perBatch){const chunk=data.slice(i,i+perBatch);statements.push(db().prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${chunk.map(()=>`(${columns.map(()=>'?').join(',')})`).join(',')}`).bind(...chunk.flat()));}}
 rows('sites',['id','scope','name','owner','address','color'],siteData.map((s,i)=>['demo-site-'+i,'demo',...s]));
 rows('workers',['id','scope','name','daily_wage','sample_photo'],names.map((n,i)=>['demo-worker-'+i,'demo',n,rates[i]*100,i]));
 const days:(string|number|null)[][]=[];
 for(let ago=6;ago>=0;ago--){const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-ago);const date=d.toISOString().slice(0,10);names.forEach((_,i)=>{if(ago===0&&i>=9)return;if(ago===3&&i%4===0)return;const site='demo-site-'+(i%4);const half=ago===0&&i===8;days.push(['demo-att-'+i+'-'+date,'demo','demo-worker-'+i,date,site,half?null:site,rates[i]*50,half?0:rates[i]*50,1,'Sample record',now]);});}
 rows('attendance',['id','scope','worker_id','date','am_site_id','pm_site_id','am_wage','pm_wage','version','updated_by','updated_at'],days);
 rows('payments',['id','scope','worker_id','amount','kind','date','method','notes','created_by','created_at'],names.map((_,i)=>['demo-payment-'+i,'demo','demo-worker-'+i,150000+(i%3)*50000,'advance',today,'cash','Sample advance','Sample record',now]));
 try{await db().batch(statements);}catch(e){if(!await db().prepare("SELECT id FROM settings WHERE id = 'demo_seeded'").first())throw e;}
}
