export type ExpenseLike={
  date:string;
  amount:number;
  is_waste:boolean;
  recurring:boolean;
  avoid_next_time?:string|null;
};

export function expenseMonthStats(rows:ExpenseLike[],month:string){
  const current=rows.filter(r=>String(r.date||"").startsWith(month));
  const spent=current.reduce((sum,r)=>sum+Number(r.amount||0),0);
  const waste=current.filter(r=>r.is_waste).reduce((sum,r)=>sum+Number(r.amount||0),0);
  const recurringWaste=current.filter(r=>r.is_waste&&r.recurring).reduce((sum,r)=>sum+Number(r.amount||0),0);
  const lessons=current.filter(r=>r.is_waste&&String(r.avoid_next_time||"").trim()).length;
  return{spent,waste,recurringWaste,lessons,wastePct:spent?Math.round(waste/spent*100):0};
}
