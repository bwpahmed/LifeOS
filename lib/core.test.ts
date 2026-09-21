import { describe, expect, it } from "vitest";
import { priorityScore, whyPriority } from "./priority";
import { applyPayment, remaining, escalation } from "./money";
import { nextOccurrence } from "./recurrence";
import { previewLegacyImport, dedupe } from "./legacy-import";
import { habitConsistency, habitConsistencyForFrequency, habitPeriodStreak, recoveryScore, goalProgressFromTasks } from "./habits";
import { canSeeModule } from "./permissions";
import { serverWins } from "./sync-queue";
import { deterministicParse, validateParsed } from "./ai/service";
import { ageParts,daysUntilRetirement,retirementDate,retirementProgress } from "./life-clock";
import { expenseMonthStats } from "./waste";
import { activeForIsoDay,clampWaterGoal,parseReminderTimes,sleepMinutes,waterTotalForDate } from "./health-planner";
import { isPublicPath,requestedPath,safeNextPath } from "./auth-routing";
import { passwordMeetsLifeOSPolicy } from "./password-policy";

describe("priority score (prototype parity)", () => {
  it("completed tasks score 0", () => {
    expect(priorityScore({ status: "Completed", deadline: "2020-01-01" })).toBe(0);
  });
  it("estimated effort is a small transparent tie-breaker", () => {
    const fast = priorityScore({ status: "Planned", deadline: "2026-09-20", importance: 3, estimateMin: 15 }, new Date("2026-09-20T12:00:00"));
    const long = priorityScore({ status: "Planned", deadline: "2026-09-20", importance: 3, estimateMin: 180 }, new Date("2026-09-20T12:00:00"));
    expect(fast).toBeGreaterThan(long);
    expect(whyPriority({ status: "Planned", deadline: "2026-09-20", estimateMin: 15 }, new Date("2026-09-20T12:00:00")).join(" ")).toMatch(/quick win/i);
  });
  it("overdue critical money task scores high with reasons", () => {
    const s = priorityScore({ status: "Today", deadline: "2020-01-01", importance: 5, value: 25000, area: "Money" }, new Date("2026-09-16T12:00:00"));
    expect(s).toBeGreaterThanOrEqual(90);
    expect(whyPriority({ status: "Today", deadline: "2020-01-01", importance: 5, value: 25000 }, new Date("2026-09-16T12:00:00")).join(" ")).toMatch(/overdue|financial/i);
  });
});

describe("receivable ledger", () => {
  it("Mustafa 25k - 10k payment keeps total, remaining 15k", () => {
    const r = applyPayment(25000, [], { amount: 10000, date: "2026-09-16" });
    expect(r.paid).toBe(10000);
    expect(r.remaining).toBe(15000);
    expect(remaining(25000, r.txs)).toBe(15000);
  });
  it("escalates 10d overdue to Critical", () => {
    expect(escalation({ overdueDays: 10, promiseMissed: false })).toBe("Critical");
    expect(escalation({ overdueDays: 1, promiseMissed: true })).toBe("Critical");
  });
});

describe("recurrence", () => {
  it("daily advances one day, no bulk creation", () => {
    expect(nextOccurrence("2026-09-16", { kind: "daily" })).toBe("2026-09-17");
    expect(nextOccurrence("2026-09-16", { kind: "none" })).toBeNull();
  });
  it("supports every-X-days without exploding future rows", () => {
    expect(nextOccurrence("2026-09-16", { kind: "everyXDays", days: 3 })).toBe("2026-09-19");
    expect(nextOccurrence("2026-09-16", { kind: "everyXDays", days: 0 })).toBe("2026-09-17");
  });
  it("supports specific weekdays and picks only the next matching day", () => {
    // 16 Sep 2026 is Wednesday. 1=Mon ... 5=Fri in the app weekday selector.
    expect(nextOccurrence("2026-09-16", { kind: "weekdays", days: [1, 5] })).toBe("2026-09-18");
    expect(nextOccurrence("2026-09-18", { kind: "weekdays", days: [1, 5] })).toBe("2026-09-21");
  });
});

describe("legacy import", () => {
  it("previews counts and dedupes", () => {
    const p = previewLegacyImport({ tasks: [{ name: "a" }], habits: [], settings: {} });
    expect(p.counts.tasks).toBe(1);
    const kept = dedupe("tasks", [{ name: "Call", date: "2026-09-16" }], [{ name: "call", date: "2026-09-16" }, { name: "New", date: "2026-09-17" }]);
    expect(kept.map((r) => r.name)).toEqual(["New"]);
  });
});

describe("habits/goals/permissions/sync", () => {
  it("one miss does not zero consistency", () => {
    expect(habitConsistency({ "2026-09-14": 1, "2026-09-15": 1 }, ["2026-09-14", "2026-09-15", "2026-09-16"])).toBe(67);
  });
  it("weekly target uses periods instead of pretending every day is expected", () => {
    const days = ["2026-09-07","2026-09-08","2026-09-09","2026-09-10","2026-09-11","2026-09-12","2026-09-13","2026-09-14","2026-09-15","2026-09-16"];
    expect(habitConsistencyForFrequency({ "2026-09-07": 1, "2026-09-09": 1, "2026-09-14": 1 }, days, "X times per week", 2)).toBe(75);
    expect(habitPeriodStreak({ "2026-09-07": 1, "2026-09-09": 1, "2026-09-14": 1 }, days, "X times per week", 2)).toBe(1);
    expect(recoveryScore({ "2026-09-07": 1 }, ["2026-09-07","2026-09-08","2026-09-09"], "Daily", 1)).toBe(0);
  });
  it("goal progress derives from tasks", () => {
    expect(goalProgressFromTasks(1, 4)).toBe(25);
  });
  it("family member cannot see private health without grant", () => {
    expect(canSeeModule("member", "health", ["family", "baby"])).toBe(false);
    expect(canSeeModule("member", "health", ["health"])).toBe(true);
  });
  it("server wins on newer updated_at", () => {
    expect(serverWins("2026-09-16T10:00:00Z", "2026-09-16T09:00:00Z")).toBe(true);
  });
});

describe("smart capture", () => {
  it("parses Mustafa Urdu/Hindi mix deterministically", () => {
    const p = validateParsed(deterministicParse("Kal subah Mustafa ko 25000 AED payment ke liye call karna", "2026-09-16"));
    expect(p.life_area).toBe("Money");
    expect(p.amount).toBe(25000);
    expect(p.due_date).toBe("2026-09-17");
    expect(p.person.toLowerCase()).toBe("mustafa");
  });
});


describe("Waste Guard", () => {
  it("calculates monthly waste, recurring leaks and saved lessons", () => {
    const stats=expenseMonthStats([
      {date:"2026-09-01",amount:100,is_waste:true,recurring:false,avoid_next_time:"Wait 24h"},
      {date:"2026-09-02",amount:50,is_waste:true,recurring:true,avoid_next_time:null},
      {date:"2026-09-03",amount:350,is_waste:false,recurring:false},
      {date:"2026-08-31",amount:999,is_waste:true,recurring:true,avoid_next_time:"Old month"},
    ],"2026-09");
    expect(stats).toEqual({spent:500,waste:150,recurringWaste:50,lessons:1,wastePct:30});
  });
});

describe("health planner helpers", () => {
  it("rejects invalid reminder clock values instead of silently scheduling nonsense", () => {
    expect(parseReminderTimes("09:00, 23:59, 99:99, 12:60")).toEqual({
      times:["09:00","23:59"],
      invalid:["99:99","12:60"],
    });
  });
  it("clamps water targets to safe UI limits", () => {
    expect(clampWaterGoal(100)).toBe(250);
    expect(clampWaterGoal(12000)).toBe(10000);
    expect(clampWaterGoal(undefined)).toBe(2500);
  });
  it("tracks overnight sleep duration correctly", () => {
    expect(sleepMinutes("23:00","07:00")).toBe(480);
    expect(sleepMinutes("22:30","06:15")).toBe(465);
    expect(sleepMinutes("25:00","07:00")).toBeNull();
  });
  it("sums water by date and selects routines for the current ISO day", () => {
    expect(waterTotalForDate([{date:"2026-09-20",amount_ml:250},{date:"2026-09-20",amount_ml:500},{date:"2026-09-19",amount_ml:999}],"2026-09-20")).toBe(750);
    expect(activeForIsoDay([{active:true,days_of_week:[1,7],name:"a"},{active:false,days_of_week:[7],name:"b"}],7).map(x=>x.name)).toEqual(["a"]);
  });
});


describe("life clock", () => {
  it("calculates Ahmed's age and retirement target deterministically", () => {
    const now = new Date("2026-09-21T00:00:00Z");
    expect(ageParts("1992-02-25", now)).toEqual({ years: 34, months: 6, days: 27 });
    expect(retirementDate("1992-02-25", 40)).toBe("2032-02-25");
    expect(daysUntilRetirement("1992-02-25", 40, now)).toBeGreaterThan(1900);
    expect(retirementProgress("1992-02-25", 40, now)).toBeGreaterThan(80);
  });
});


describe("login routing", () => {
  it("keeps auth and PWA assets public while protecting app pages", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/manifest.webmanifest")).toBe(true);
    expect(isPublicPath("/sw.js")).toBe(true);
    expect(isPublicPath("/tasks")).toBe(false);
    expect(isPublicPath("/")).toBe(true);
  });
  it("returns signed-in users only to safe internal destinations", () => {
    expect(safeNextPath("/tasks?status=Today")).toBe("/tasks?status=Today");
    expect(requestedPath("/goals","?view=active")).toBe("/goals?view=active");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil")).toBe("/");
  });
});


describe("password recovery policy", () => {
  it("requires a strong replacement password", () => {
    expect(passwordMeetsLifeOSPolicy("short")).toBe(false);
    expect(passwordMeetsLifeOSPolicy("longbutalllowercase1!")).toBe(false);
    expect(passwordMeetsLifeOSPolicy("LifeOS-Safe-2026!")).toBe(true);
  });
});
