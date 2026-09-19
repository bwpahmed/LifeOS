"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

type LegacyRow = Record<string, any>;

export interface LegacyImportResult {
  inserted: Record<string, number>;
  skipped: Record<string, number>;
  warnings: string[];
}

function list(data: LegacyRow, key: string): LegacyRow[] {
  return Array.isArray(data[key]) ? data[key] as LegacyRow[] : [];
}

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function keyNameDate(name: unknown, date: unknown) {
  return `${norm(name)}|${String(date ?? "")}`;
}

async function insertRows(
  sb: SupabaseClient,
  table: string,
  rows: LegacyRow[],
  result: LegacyImportResult
) {
  if (!rows.length) return;
  const { error } = await sb.from(table).insert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  result.inserted[table] = (result.inserted[table] || 0) + rows.length;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Unsupported legacy photo format");
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  return { blob: new Blob([bytes], { type: mime }), ext };
}

export async function commitLegacyImport(opts: {
  sb: SupabaseClient;
  data: LegacyRow;
  workspaceId: string;
  userId: string;
}): Promise<LegacyImportResult> {
  const { sb, data, workspaceId, userId } = opts;
  const result: LegacyImportResult = { inserted: {}, skipped: {}, warnings: [] };

  const [
    existingGoals,
    existingProjects,
    existingTasks,
    existingHabits,
    existingReceivables,
    existingMembers,
    existingFamilyTasks,
    existingHealth,
    existingLabs,
    existingBaby,
    existingCountries,
    existingDocs,
    existingJournal,
  ] = await Promise.all([
    sb.from("goals").select("id,name,deadline").eq("workspace_id", workspaceId),
    sb.from("projects").select("id,name,deadline").eq("workspace_id", workspaceId),
    sb.from("tasks").select("id,name,deadline").eq("workspace_id", workspaceId),
    sb.from("habits").select("id,name").eq("workspace_id", workspaceId),
    sb.from("receivables").select("id,name,due_date").eq("workspace_id", workspaceId),
    sb.from("family_members").select("id,name").eq("workspace_id", workspaceId),
    sb.from("family_tasks").select("id,title,due_date").eq("workspace_id", workspaceId),
    sb.from("health_entries").select("id,date").eq("workspace_id", workspaceId),
    sb.from("lab_results").select("id,test_name,date").eq("workspace_id", workspaceId),
    sb.from("baby_records").select("id,title,date").eq("workspace_id", workspaceId),
    sb.from("migration_countries").select("id,country,route").eq("workspace_id", workspaceId),
    sb.from("migration_documents").select("id,name,status").eq("workspace_id", workspaceId),
    sb.from("journal_entries").select("id,body,date").eq("workspace_id", workspaceId),
  ]);

  for (const q of [existingGoals,existingProjects,existingTasks,existingHabits,existingReceivables,existingMembers,existingFamilyTasks,existingHealth,existingLabs,existingBaby,existingCountries,existingDocs,existingJournal]) {
    if (q.error) throw q.error;
  }

  const goalMap = new Map<string, string>();
  const goalExisting = new Map((existingGoals.data || []).map((x: any) => [keyNameDate(x.name, x.deadline), x.id]));
  const goalRows: LegacyRow[] = [];
  for (const g of list(data, "goals")) {
    const key = keyNameDate(g.name, g.deadline);
    const existingId = goalExisting.get(key);
    const id = existingId || crypto.randomUUID();
    if (g.id) goalMap.set(String(g.id), id);
    if (existingId) {
      result.skipped.goals = (result.skipped.goals || 0) + 1;
      continue;
    }
    goalRows.push({
      id, workspace_id: workspaceId, created_by: userId,
      name: String(g.name || "Untitled goal"), area: g.area || "Personal", why: g.why || null,
      target: Number(g.target || 0), unit: g.unit || "%", deadline: g.deadline || null,
      status: g.status || "On Track", progress: Number(g.progress || 0), privacy: "family",
      created_at: g.createdAt || undefined,
    });
  }
  await insertRows(sb, "goals", goalRows, result);

  const milestoneRows: LegacyRow[] = [];
  for (const g of list(data, "goals")) {
    const goalId = g.id ? goalMap.get(String(g.id)) : undefined;
    if (!goalId || !g.milestones) continue;
    for (const title of String(g.milestones).split(",").map((x) => x.trim()).filter(Boolean)) {
      milestoneRows.push({ id: crypto.randomUUID(), goal_id: goalId, title, done: false });
    }
  }
  await insertRows(sb, "goal_milestones", milestoneRows, result);

  const projectMap = new Map<string, string>();
  const projectExisting = new Map((existingProjects.data || []).map((x: any) => [keyNameDate(x.name, x.deadline), x.id]));
  const projectRows: LegacyRow[] = [];
  for (const p of list(data, "projects")) {
    const key = keyNameDate(p.name, p.deadline);
    const existingId = projectExisting.get(key);
    const id = existingId || crypto.randomUUID();
    if (p.id) projectMap.set(String(p.id), id);
    if (existingId) {
      result.skipped.projects = (result.skipped.projects || 0) + 1;
      continue;
    }
    projectRows.push({
      id, workspace_id: workspaceId, created_by: userId,
      goal_id: p.goalId ? goalMap.get(String(p.goalId)) || null : null,
      area: p.area || "Business", name: p.name || "Untitled project", owner: p.owner || "Me",
      deadline: p.deadline || null, status: p.status || "Active", notes: p.notes || null, privacy: "family",
    });
  }
  await insertRows(sb, "projects", projectRows, result);

  const taskMap = new Map<string, string>();
  const taskExisting = new Map((existingTasks.data || []).map((x: any) => [keyNameDate(x.name, x.deadline), x.id]));
  const taskRows: LegacyRow[] = [];
  for (const t of list(data, "tasks")) {
    const key = keyNameDate(t.name, t.deadline);
    const existingId = taskExisting.get(key);
    const id = existingId || crypto.randomUUID();
    if (t.id) taskMap.set(String(t.id), id);
    if (existingId) {
      result.skipped.tasks = (result.skipped.tasks || 0) + 1;
      continue;
    }
    const recurrence = t.recurring ? { kind: String(t.recurring).toLowerCase() } : { kind: "none" };
    taskRows.push({
      id, workspace_id: workspaceId, created_by: userId, name: t.name || "Untitled task",
      area: t.area || "Personal", project_id: t.projectId ? projectMap.get(String(t.projectId)) || null : null,
      status: t.status || "Inbox", importance: Number(t.importance || 3), start_date: t.startDate || null,
      deadline: t.deadline || null, reminder_time: t.reminder || null, recurrence,
      estimate_min: Number(t.estimate || 30), actual_min: Number(t.actual || 0),
      financial_value: Number(t.value || 0), waiting_for: t.responsible && t.responsible !== "Me" ? t.responsible : null,
      notes: t.notes || null, completed_at: t.completedAt || null, created_at: t.createdAt || undefined,
      privacy: "family",
    });
  }
  await insertRows(sb, "tasks", taskRows, result);

  const dependencyRows: LegacyRow[] = [];
  for (const t of list(data, "tasks")) {
    const taskId = t.id ? taskMap.get(String(t.id)) : undefined;
    const dependsOn = t.blockedBy ? taskMap.get(String(t.blockedBy)) : undefined;
    if (taskId && dependsOn && taskId !== dependsOn) dependencyRows.push({ task_id: taskId, depends_on: dependsOn });
  }
  await insertRows(sb, "task_dependencies", dependencyRows, result);

  const habitMap = new Map<string, string>();
  const habitExisting = new Map((existingHabits.data || []).map((x: any) => [norm(x.name), x.id]));
  const habitRows: LegacyRow[] = [];
  const habitLogRows: LegacyRow[] = [];
  for (const h of list(data, "habits")) {
    const existingId = habitExisting.get(norm(h.name));
    const id = existingId || crypto.randomUUID();
    if (h.id) habitMap.set(String(h.id), id);
    if (!existingId) habitRows.push({
      id, workspace_id: workspaceId, created_by: userId, name: h.name || "Habit",
      area: h.area || "Personal", frequency: h.type || "Daily", target: Number(h.target || 1),
      unit: h.unit || "done", kind: "build", privacy: "family",
    });
    else result.skipped.habits = (result.skipped.habits || 0) + 1;

    if (h.logs && typeof h.logs === "object") {
      for (const [date, value] of Object.entries(h.logs)) {
        if (Number(value || 0) > 0) habitLogRows.push({ id: crypto.randomUUID(), habit_id: id, date, value: Number(value) });
      }
    }
  }
  await insertRows(sb, "habits", habitRows, result);
  if (habitLogRows.length) {
    const { error } = await sb.from("habit_logs").upsert(habitLogRows, { onConflict: "habit_id,date", ignoreDuplicates: true });
    if (error) throw new Error(`habit_logs: ${error.message}`);
    result.inserted.habit_logs = habitLogRows.length;
  }

  const receivableMap = new Map<string, string>();
  const recExisting = new Map((existingReceivables.data || []).map((x: any) => [keyNameDate(x.name, x.due_date), x.id]));
  const recRows: LegacyRow[] = [];
  const paymentRows: LegacyRow[] = [];
  const followupRows: LegacyRow[] = [];
  for (const r of list(data, "receivables")) {
    const key = keyNameDate(r.name, r.dueDate);
    const existingId = recExisting.get(key);
    const id = existingId || crypto.randomUUID();
    if (r.id) receivableMap.set(String(r.id), id);
    if (!existingId) recRows.push({
      id, workspace_id: workspaceId, created_by: userId, name: r.name || "Receivable",
      company: r.company || null, phone: r.phone || null, whatsapp: r.whatsapp || null, email: r.email || null,
      total: Number(r.total || 0), due_date: r.dueDate || null, last_followup: r.lastFollowUp || null,
      next_followup: r.nextFollowUp || null, promise_date: r.promiseDate || null,
      status: r.status || "Due", notes: r.notes || null, privacy: "family",
    });
    else result.skipped.receivables = (result.skipped.receivables || 0) + 1;

    if (!existingId) {
      const txs = Array.isArray(r.transactions) ? r.transactions : [];
      if (txs.length) {
        for (const p of txs) paymentRows.push({ id: crypto.randomUUID(), receivable_id: id, created_by: userId, amount: Number(p.amount || 0), date: p.date || null, method: p.method || "Other", note: p.note || null });
      } else if (Number(r.paid || 0) > 0) {
        paymentRows.push({ id: crypto.randomUUID(), receivable_id: id, created_by: userId, amount: Number(r.paid), date: r.lastFollowUp || r.dueDate || null, method: "Legacy", note: "Imported legacy paid amount" });
      }
      for (const f of Array.isArray(r.followups) ? r.followups : []) followupRows.push({ id: crypto.randomUUID(), receivable_id: id, created_by: userId, date: f.date || null, method: f.type || "Other", note: f.note || "", promise_date: f.promiseDate || null, next_followup: f.nextFollowUp || null, status: f.status || null });
    }
  }
  await insertRows(sb, "receivables", recRows, result);
  await insertRows(sb, "receivable_payments", paymentRows, result);
  await insertRows(sb, "receivable_followups", followupRows, result);

  const memberMap = new Map<string, string>();
  const memberExisting = new Map((existingMembers.data || []).map((x: any) => [norm(x.name), x.id]));
  const memberRows: LegacyRow[] = [];
  for (const m of list(data, "family")) {
    const existingId = memberExisting.get(norm(m.name));
    const id = existingId || crypto.randomUUID();
    if (m.id) memberMap.set(String(m.id), id);
    if (!existingId) memberRows.push({ id, workspace_id: workspaceId, created_by: userId, name: m.name || "Family", relation: m.relation || null });
    else result.skipped.family_members = (result.skipped.family_members || 0) + 1;
  }
  await insertRows(sb, "family_members", memberRows, result);

  const familyTaskExisting = new Set((existingFamilyTasks.data || []).map((x: any) => keyNameDate(x.title, x.due_date)));
  const familyTaskRows = list(data, "familyTasks").filter((t) => {
    const key = keyNameDate(t.title, t.dueDate);
    if (familyTaskExisting.has(key)) { result.skipped.family_tasks = (result.skipped.family_tasks || 0) + 1; return false; }
    familyTaskExisting.add(key); return true;
  }).map((t) => ({
    id: crypto.randomUUID(), workspace_id: workspaceId, created_by: userId,
    title: t.title || "Family task", member_id: t.memberId ? memberMap.get(String(t.memberId)) || null : null,
    due_date: t.dueDate || null, responsible: t.responsible || "Me", status: t.status || "Pending",
    reminder_days: Number(t.reminderDays || 2), notes: t.notes || null,
  }));
  await insertRows(sb, "family_tasks", familyTaskRows, result);

  const babyExisting = new Set((existingBaby.data || []).map((x: any) => keyNameDate(x.title, x.date)));
  const babyRows = list(data, "babyRecords").filter((b) => {
    const key=keyNameDate(b.title,b.date); if(babyExisting.has(key)){result.skipped.baby_records=(result.skipped.baby_records||0)+1;return false;}babyExisting.add(key);return true;
  }).map((b)=>({id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,date:b.date||null,type:b.type||null,title:b.title||"Baby record",value:b.value||null,notes:b.notes||null}));
  await insertRows(sb,"baby_records",babyRows,result);

  const healthExisting = new Set((existingHealth.data || []).map((x: any) => String(x.date)));
  const healthRows = list(data,"healthEntries").filter((h)=>{if(healthExisting.has(String(h.date))){result.skipped.health_entries=(result.skipped.health_entries||0)+1;return false;}healthExisting.add(String(h.date));return true;}).map((h)=>({
    id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,date:h.date,sleep:Number(h.sleep||0)||null,energy:Number(h.energy||0)||null,mood:Number(h.mood||0)||null,stress:Number(h.stress||0)||null,steps:Number(h.steps||0)||null,weight:h.weight?Number(h.weight):null,waist:h.waist?Number(h.waist):null,protein:h.protein||null,notes:h.notes||null,privacy:"private"
  }));
  await insertRows(sb,"health_entries",healthRows,result);

  const labExisting = new Set((existingLabs.data || []).map((x:any)=>keyNameDate(x.test_name,x.date)));
  const labRows=list(data,"labs").filter((l)=>{const key=keyNameDate(l.test,l.date);if(labExisting.has(key)){result.skipped.lab_results=(result.skipped.lab_results||0)+1;return false;}labExisting.add(key);return true;}).map((l)=>({
    id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,test_name:l.test||"Lab",date:l.date||null,result:l.result==null?null:String(l.result),unit:l.unit||null,ref_range:l.range||null,doctor_notes:l.notes||null,privacy:"private"
  }));
  await insertRows(sb,"lab_results",labRows,result);

  const urgeRows=list(data,"urges").map((u)=>({id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,date:u.date||null,time:u.time||null,level:Number(u.level||0)||null,trigger:u.trigger||null,response:u.action||u.response||null,outcome:u.outcome||null,notes:u.notes||null,privacy:"private"}));
  await insertRows(sb,"urge_logs",urgeRows,result);

  const countryMap=new Map<string,string>();
  const countryExisting=new Map((existingCountries.data||[]).map((x:any)=>[`${norm(x.country)}|${norm(x.route)}`,x.id]));
  const countryRows:LegacyRow[]=[];
  for(const c of list(data,"countries")){
    const key=`${norm(c.name||c.country)}|${norm(c.route)}`;const existingId=countryExisting.get(key);const id=existingId||crypto.randomUUID();if(c.id)countryMap.set(String(c.id),id);
    if(!existingId)countryRows.push({id,workspace_id:workspaceId,created_by:userId,country:c.name||c.country||"Country",route:c.route||null,status:c.status||"Research",progress:Number(c.progress||0),notes:c.notes||null});
    else result.skipped.migration_countries=(result.skipped.migration_countries||0)+1;
  }
  await insertRows(sb,"migration_countries",countryRows,result);

  const docExisting=new Set((existingDocs.data||[]).map((x:any)=>`${norm(x.name)}|${norm(x.status)}`));
  const docRows=list(data,"migrationDocs").filter((d)=>{const key=`${norm(d.name)}|${norm(d.status)}`;if(docExisting.has(key)){result.skipped.migration_documents=(result.skipped.migration_documents||0)+1;return false;}docExisting.add(key);return true;}).map((d)=>({
    id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,country_id:d.countryId?countryMap.get(String(d.countryId))||null:null,name:d.name||"Document",owner:d.owner||"Me",status:d.status||"Missing",issue_date:d.issueDate||null,expiry_date:d.expiryDate||null,needs_attestation:Boolean(d.needsAttestation),notes:d.notes||null
  }));
  await insertRows(sb,"migration_documents",docRows,result);

  const focusRows=list(data,"focusSessions").map((f)=>({id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,task_id:f.taskId?taskMap.get(String(f.taskId))||null:null,date:f.date||null,minutes:Number(f.minutes||0),created_at:f.at||undefined}));
  await insertRows(sb,"focus_sessions",focusRows,result);

  const journalExisting=new Set((existingJournal.data||[]).map((x:any)=>keyNameDate(x.body,x.date)));
  const journalRows=list(data,"journal").filter((j)=>{const key=keyNameDate(j.text,j.date);if(journalExisting.has(key)){result.skipped.journal_entries=(result.skipped.journal_entries||0)+1;return false;}journalExisting.add(key);return true;}).map((j)=>({
    id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,date:j.date||null,mood:j.mood||"Note",body:j.text||"",tags:String(j.tags||"").split(",").map((x)=>x.trim()).filter(Boolean),privacy:"private"
  }));
  await insertRows(sb,"journal_entries",journalRows,result);

  const dailyRows=list(data,"dailyReviews").map((r)=>({id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,date:r.date||null,accomplishment:r.accomplishment||null,incomplete:r.incomplete||null,blocker:r.blocker||null,energy:Number(r.energy||0)||null,improve:r.improve||null,snapshot:r}));
  await insertRows(sb,"daily_reviews",dailyRows,result);
  const weeklyRows=list(data,"weeklyReviews").map((r)=>({id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,date:r.date||null,snapshot:r}));
  await insertRows(sb,"weekly_reviews",weeklyRows,result);
  const automationRows=list(data,"customRules").map((r)=>({id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,name:r.name||"Legacy rule",trigger:r.when||"",conditions:{},action:r.action||"",enabled:r.enabled!==false}));
  await insertRows(sb,"automation_rules",automationRows,result);

  const activityRows=list(data,"activity").slice(0,250).map((a)=>({id:crypto.randomUUID(),workspace_id:workspaceId,created_by:userId,action:a.action||"Legacy activity",detail:a.detail||null,created_at:a.at||undefined}));
  await insertRows(sb,"activity_log",activityRows,result);

  const photos=list(data,"hairPhotos");
  for(const p of photos){
    if(!p.dataUrl){result.skipped.hair_photos=(result.skipped.hair_photos||0)+1;continue;}
    try{
      const {blob,ext}=dataUrlToBlob(String(p.dataUrl));
      const id=crypto.randomUUID();
      const path=`${userId}/hair/${id}.${ext}`;
      const up=await sb.storage.from("lifeos-private").upload(path,blob,{upsert:false,contentType:blob.type});
      if(up.error)throw up.error;
      const ins=await sb.from("hair_photos").insert({id,workspace_id:workspaceId,created_by:userId,date:p.date||null,label:p.label||"Legacy photo",path,privacy:"private"});
      if(ins.error)throw ins.error;
      result.inserted.hair_photos=(result.inserted.hair_photos||0)+1;
    }catch(e){
      result.skipped.hair_photos=(result.skipped.hair_photos||0)+1;
      result.warnings.push(`Hair photo ${p.label||p.date||""}: ${e instanceof Error?e.message:"upload failed"}`);
    }
  }

  return result;
}
