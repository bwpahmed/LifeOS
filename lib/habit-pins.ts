/** Sorting only; Supabase user_habit_pins owns pinned IDs, not browser storage. */
export function orderPinnedHabits<T extends {id:string;name:string}>(habits:T[],pinnedIds:readonly string[]):T[]{
 const pinned=new Set(pinnedIds);
 return [...habits].sort((a,b)=>Number(pinned.has(b.id))-Number(pinned.has(a.id))||a.name.localeCompare(b.name));
}
export function addOrRemovePin(ids:readonly string[],id:string,pin:boolean):string[]{
 const existing=new Set(ids);
 if(pin)existing.add(id);else existing.delete(id);
 return [...existing];
}
