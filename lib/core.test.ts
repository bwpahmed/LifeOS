import { describe, expect, it } from "vitest";
import { priorityScore, whyPriority } from "./priority";
import { applyPayment, remaining, escalation } from "./money";
import { nextOccurrence } from "./recurrence";
import { previewLegacyImport, dedupe } from "./legacy-import";
import { habitConsistency, habitConsistencyForFrequency, habitPeriodStreak, recoveryScore, goalProgressFromTasks } from "./habits";
import { canSeeModule } from "./permissions";
import { serverWins } from "./sync-queue";
import { deterministicParse, validateParsed } from "./ai/service";

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
