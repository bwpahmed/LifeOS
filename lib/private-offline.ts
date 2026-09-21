"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

const DB_NAME="lifeos_private_offline_v1";
const DB_VERSION=1;

type PrivateQueued={id:string;kind:"journal_upsert";iv:number[];cipher:number[];createdAt:string};

function openDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("meta"))db.createObjectStore("meta");if(!db.objectStoreNames.contains("queue"))db.createObjectStore("queue",{keyPath:"id"});};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
function request<T>(req:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function key():Promise<CryptoKey>{
 const db=await openDb();const tx=db.transaction("meta","readwrite");const store=tx.objectStore("meta");const existing=await request(store.get("aes-key")) as CryptoKey|undefined;
 if(existing){db.close();return existing;}
 const generated=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
 store.put(generated,"aes-key");await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();return generated;
}
async function encrypt(value:unknown){const k=await key();const iv=crypto.getRandomValues(new Uint8Array(12));const plain=new TextEncoder().encode(JSON.stringify(value));const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},k,plain);return{iv:Array.from(iv),cipher:Array.from(new Uint8Array(cipher))};}
async function decrypt(item:PrivateQueued){const k=await key();const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(item.iv)},k,new Uint8Array(item.cipher));return JSON.parse(new TextDecoder().decode(plain)) as Record<string,unknown>;}

export async function queuePrivateJournal(row:Record<string,unknown>){
 const encrypted=await encrypt(row);const item:PrivateQueued={id:"journal:"+String(row.id),kind:"journal_upsert",...encrypted,createdAt:new Date().toISOString()};
 const db=await openDb();const tx=db.transaction("queue","readwrite");tx.objectStore("queue").put(item);await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();return item.id;
}
export async function privateQueueCount(){const db=await openDb();const tx=db.transaction("queue","readonly");const count=await request(tx.objectStore("queue").count());db.close();return count;}
export async function replayPrivateQueue(client:SupabaseClient){
 if(typeof navigator!=="undefined"&&!navigator.onLine)return{synced:0,remaining:await privateQueueCount()};
 const db=await openDb();const tx=db.transaction("queue","readonly");const items=await request(tx.objectStore("queue").getAll()) as PrivateQueued[];db.close();let synced=0;
 for(const item of items){try{const row=await decrypt(item);if(item.kind==="journal_upsert"){const q=await client.from("journal_entries").upsert(row,{onConflict:"id"});if(q.error)throw q.error;}const write=await openDb();const wtx=write.transaction("queue","readwrite");wtx.objectStore("queue").delete(item.id);await new Promise<void>((resolve,reject)=>{wtx.oncomplete=()=>resolve();wtx.onerror=()=>reject(wtx.error);});write.close();synced++;}catch{}}
 return{synced,remaining:Math.max(0,items.length-synced)};
}
